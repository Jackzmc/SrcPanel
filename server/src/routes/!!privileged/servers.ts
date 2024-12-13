import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { NO_PERMISSION, NOT_FOUND } from '../../responses.js';
import JWT from '../../jwt-promise.js'
import { PlayerAction, ServerData, ServerDetailed, ServerInfo } from '../../../../common-types/Server.js';
import { LiveRecord, LiveRecordType } from '../../../../common-types/Live.js';
import { UserPrivilegeCode } from '../../../../common-types/Privileges.js';
import DNS from 'dns/promises'
import assert from 'assert';
import { WebSocket } from '@fastify/websocket';

const COMMENT_LINE_REGEX = new RegExp(/^\s*(\/\/|#)/)
const HIDDEN_COMMANDS = [
    "rcon_password"
]
export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addContentTypeParser(
        'text/plain',
        { parseAs: 'string' },
        (req, body, done) => done(null, body)
    )

    fastify.post('/validate/:address', async(req: FastifyRequest<{Params: { address: 'string' }}>, reply) => {
        const [host,port] = req.params.address.split(':')
        if(!port) {
            return reply.status(400).send({
                error: "INVALID_ADDRESS",
                message: "A port is required"
            })
        }

        let foundType: string | undefined = undefined

        const { address: ip } = await DNS.lookup(host)

        async function tryType(type: string) {
            try {
                const a = await fastify.servers.queryHost(ip, parseInt(port), type)
                console.log(a)
                foundType = type
                return true
            } catch(err) {
                console.log(err.cause)
                // Underlying errors aren't exposed annoyingly...
                if(err.stack.includes("Error: No protocols succeeded")) return false
                throw err
            }
        }

        for (const type of ["minecraft", "left4dead2"]) {
            if(await tryType(type)) break
        }
        if(foundType) {
            return {
                ip: ip,
                domain: host,
                port: port,
                type: foundType
            }
        } else {
            return reply.status(501).send({
                error: "UNKNOWN_TYPE",
                message: "Server is either unavailable or unsupported. Could not determine it's type"
            })
        }
    })

    fastify.get('/:id', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply): Promise<ServerInfo> => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user!.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server (code: " + code + ")", code)

        return server.info
    })


    fastify.get('/:id/data', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply): Promise<ServerDetailed> => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user!.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server (code: " + code + ")", code)
        const configs = req.user!.hasPermission("servers.configs.read", server.id) && server.Configs?.available ? await server.Configs.getConfigFiles() : null

        return {
            server: server.info,
            uptime: server.uptime,
            startTime: server.startTime,
            live: server.Plugin?.liveStatus,
            configs
        }
    })

    fastify.get('/:id/configs', async(req: FastifyRequest<{Params: { id: 'string' }, Querystring: { path: 'string', raw?: boolean }}>, reply) => {
        // if(req.query.raw && !req.user!.hasPermission("servers.configs.read_raw")) return NO_PERMISSION(reply)
        // else if(!req.user!.hasPermission("servers.configs.read")) return NO_PERMISSION(reply)

        const server = fastify.servers.getServer(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        } else if(!req.query.path) {
            return reply.code(401).send({
                error: "MISSING_CFG_PATH",
                message: "Provide the path of the config with the ?path parameter"
            })
        } else if(!server.Configs?.available) {
            return reply.code(501).send({
                error: "NO_CFG_SETUP",
                message: "Server has no config path configured"
            })
        }

        const [code, granted] = req.user!.requirePermission(`servers.configs.${req.query.raw ? 'read_raw' : 'read'}`, { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view server configs", code)

        const path = join(server.Configs.configDir, req.query.path)
        // Make sure supplied path has no path traversal
        if(path.startsWith(server.Configs.configDir)) {
            try {
                if(req.query.raw) return await readFile(path, 'utf-8')
                const lines = (await readFile(path, 'utf-8')).split("\n")
                let records: {command: string, type: string, value: string, cvar?: string}[] = []
                for(const line of lines) {
                    // Ignore comments
                    if(COMMENT_LINE_REGEX.test(line) || line.trim() == "") continue
                    const split = line.split(/\s/)
                    if(split.length > 1) {
                        const command = split.shift()!
                        if(HIDDEN_COMMANDS.includes(command)) {
                            records.push({
                                command,
                                type: "hidden",
                                value: '**HIDDEN**'
                            })
                            continue
                        }
                        let cvar: string|undefined = undefined
                        if(command === "sm_cvar" && split.length > 2) {
                            cvar = split.shift()
                        }
                        let value = split.join(" ").trim()
                        const type = isNaN(Number(value)) ? "string" : "number"
                        if(type === "string" && value.at(0) == '"' && value.at(-1) == '"') {
                            value = value.slice(1, -1)
                        }
                        records.push({
                            command,
                            value,
                            cvar,
                            type
                        })

                    }
                }
                return records
            } catch(err) {
                if(err.code == "ENOENT") {
                    return reply.code(404).send({
                        error: "INVALID_PATH",
                        message: "Path specified is invalid or does not exist"
                    })
                } else {
                    fastify.log.error(err)
                    return reply.code(500).send({
                        error: "READ_FILE_ERROR",
                        message: "An error occurred while parsing or reading config file"
                    })
                }
            }
        } else {
            return reply.code(400).send({
                error: "INVALID_PATH",
                message: "Path specified is invalid"
            })
        }
    })

    fastify.get('/:id/activities', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply) => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user!.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server", code)

        let recentActivities: any[]|null = null
        if(server.activityLogId) {
            const [rows] = await fastify.db.execute<RowDataPacket[]>(`SELECT client, target, type, id, message, timestamp, s1.last_alias as clientName, s2.last_alias as targetName
                FROM activity_log PARTITION (p${new Date().getFullYear()})
                LEFT JOIN stats_users as s1 ON s1.steamid = client
                LEFT JOIN stats_users as s2 ON s2.steamid = target
                WHERE server = ? AND FROM_UNIXTIME(timestamp) >= CURDATE() AND FROM_UNIXTIME(timestamp) < CURDATE() + INTERVAL 1 DAY
                ORDER BY timestamp DESC
                LIMIT 5`,
            [server.activityLogId]
        )
            return { activities: rows}
            recentActivities = rows
        }

        return reply.code(403).send({
            error: "SERVER_LACKS_ACTIVITY",
            message: "Server does not support recent activity logs"
        })
    })

    fastify.get('/:id/generate-jwt', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.getServer(req.params.id)

        if(!server) return NOT_FOUND(reply, "Server")
        const [code, granted] = req.user!.requirePermission("servers.generate_jwt", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to generate a JWT for this server", code)
        const token = await server.Plugin.generateToken(req.user!.steamid2)
        reply.header("Content-Type", "text/plain")
        return reply.code(200).send(token)
    })


    fastify.post('/:id/start', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")
        const [code, granted] = req.user!.requirePermission("servers.action.builtin.start", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to start this server", code)
        try {
            await server.start()
            reply.status(204).send()
        } catch(err) {
            return reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error: " + err.message,
                code: 500
            })
        }
    })

    fastify.post('/:id/action/:action', async(req: FastifyRequest<{Params: { id: string, action: string } }>, reply) => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")

        if(!server.canPerformCommands) {
            return reply.status(503).send({
                error: "SERVER_UNAVAILABLE",
                message: "Command support is not available on this server at this time."
            })
        }

        let namespace = "default"
        let command: string = req.params.action
        const split = req.params.action.split(":")
        if(split.length > 1) {
            [namespace, command] = split
        }

        const [code, granted] = req.user!.requirePermission(`servers.plugin.${namespace}.${command}` as UserPrivilegeCode, { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, undefined, code)

        await req.user!.log(null, `%client% ran action %namespace%:%command%`, {
            code,
            metadata: {
                namespace,
                command
            }
        })
        const response = await server.performAction(command, namespace)
        return {
            resultType: response.type,
            result: response.result,
            message: response.message
        }
    })

    fastify.post('/:id/cmd', async(req: FastifyRequest<{Params: { id: string }, Querystring: {'no-response'?: boolean}, Body: string }>, reply) => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")

        if(req.body.includes("rcon_password"))
            return NO_PERMISSION(reply, "You do not have permission to run that command")
        const [code, granted] = req.user!.requirePermission("servers.plugin.default." + req.params.id as UserPrivilegeCode, { resourceIds: [server.id] })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to run commands on this server", code)

        if(!server.canPerformCommands) {
            return reply.code(400).send({
                error: "NO_PLUGIN",
                message: "Command support is not available on this server at this time."
            })
        }

        const id = await req.user!.log(null, `%client% ran command %cmd% on %server%`, {
            code,
            metadata: {
                server: server.id,
                cmd: req.body
            }
        })
        // await fastify.authmngr.notifyAdmins(`Admin ${req.user!.steamid2} ran server command \"${req.body}\" on server ${server.id}. Log entry: ${id}`, "notify_rcon_use", {
        //     targetSteamid: req.user!.steamid2
        // })
        const response = await server.performAction(req.body, "default")
        if(req.query['no-response'])
            return reply.status(204).send()
        else return {
            resultType: response.type,
            result: response.result,
            message: response.message
        }
    })

    fastify.post('/:id/stop', async(req: FastifyRequest<{Querystring: { force?: boolean }, Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")
        const [code, granted] = req.user!.requirePermission(req.query.force ? "servers.action.builtin.stop" : "servers.action.builtin.request_stop", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to stop this server", code)
        try {
            await server.stop(Boolean(req.query.force))
            // If not systemd, hope server auto restarts
            reply.status(204).send()
        } catch(err) {
            console.log('error', err)
            return reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error on shutdown: " + err.message,
                code: 500
            })
        }
    })

    fastify.post('/:id/create', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        reply.code(501).send()
    })

    fastify.get('/:id/logs', async (req: FastifyRequest<{ Params: { id: 'string' } }>, reply) => {
        const server = fastify.servers.getServer(req.params.id)
        if(!server) {
            return reply.status(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Unknown server with that id",
            })
        }
        const [code, granted] = req.user!.requirePermission("servers.view_console", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view the server console", code);
        if(!server.Console) {
            return reply.status(401).send({
                error: "NO_LOG_SUPPORT",
                message: "Server does not support logs"
            })
        }
            
        return server.Console?.logs.join("\n")
    })
}

const sleep = (time: number) => new Promise(res => setTimeout(res, time));
