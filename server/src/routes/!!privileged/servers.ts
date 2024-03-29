import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { NO_PERMISSION, NOT_FOUND } from '../../responses.js';
import JWT from '../../jwt-promise.js'
import { PlayerAction, ServerData, ServerDetailed } from '../../../../common-types/Server.js';
import { LiveRecord, LiveRecordType } from '../../../../common-types/Live.js';
import { UserPrivilegeCode } from '../../../../common-types/Privileges.js';
    
const COMMENT_LINE_REGEX = new RegExp(/^\s*(\/\/|#)/)
const HIDDEN_COMMANDS = [
    "rcon_password"
]
const JWT_SECRET = process.env.STATE_SECRET

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.addContentTypeParser(
        'text/plain',
        { parseAs: 'string' },
        (req, body, done) => done(null, body)
    )

    fastify.get('/:id', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply): Promise<ServerDetailed> => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server (code: " + code + ")", code)
        let playerJoins = null
        if(server.activityLogId) {
            [playerJoins] = await fastify.db.execute(
                "SELECT server, type, timestamp, COUNT(*) as count FROM activity_log WHERE server = ?  AND type = 'JOIN'AND FROM_UNIXTIME(timestamp) >= (NOW() - INTERVAL 1 MONTH) GROUP BY DATE(FROM_UNIXTIME(timestamp)), HOUR(FROM_UNIXTIME(timestamp)) order by timestamp DESC",
                [server.activityLogId]
            )
        }
        const configs = req.user.hasPermission("servers.configs.read", server.id) ? await server.getConfigFiles() : undefined

        return {
            server: server.info,
            uptime: server.uptime,
            live: server.liveStatus,
            cvars: server.cvars,
            playerCounts: server.playerCounts,
            playerJoins,
            configs
        }
    })

    fastify.get('/:id/configs', async(req: FastifyRequest<{Params: { id: 'string' }, Querystring: { path: 'string', raw?: boolean }}>, reply) => {
        // if(req.query.raw && !req.user.hasPermission("servers.configs.read_raw")) return NO_PERMISSION(reply)
        // else if(!req.user.hasPermission("servers.configs.read")) return NO_PERMISSION(reply)
        
        const server = fastify.servers.get(req.params.id)
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
        } else if(!server.hasConfigs) {
            return reply.code(501).send({
                error: "NO_CFG_SETUP",
                message: "Server has no config path configured"
            })
        }

        const [code, granted] = req.user.requirePermission(`servers.configs.${req.query.raw ? 'read_raw' : 'read'}`, { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view server configs", code)

        const path = join(server.configDir, req.query.path)
        // Make sure supplied path has no path traversal
        if(path.startsWith(server.configDir)) { 
            try {
                if(req.query.raw) return await readFile(path, 'utf-8')
                const lines = (await readFile(path, 'utf-8')).split("\n")
                let records = []
                for(const line of lines) {
                    // Ignore comments
                    if(COMMENT_LINE_REGEX.test(line) || line.trim() == "") continue
                    const split = line.split(/\s/)
                    if(split.length > 1) {
                        const command = split.shift()
                        if(HIDDEN_COMMANDS.includes(command)) {
                            records.push({
                                command,
                                type: "hidden",
                                value: '**HIDDEN**'
                            })
                            continue
                        }
                        let cvar = null
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

    fastify.get('/:id/live', (req: FastifyRequest<{Params: { id: 'string' }}>, reply) => {
        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        function send(msg: object, eventName?: string) {
            if(eventName) reply.raw.write(`event: ${eventName}\n\n`)
            reply.raw.write(`data: ${JSON.stringify(msg)}\n\n`)
        }
        reply.raw.flushHeaders()
        reply.raw.write('retry: 5000\n\n')

        const server = fastify.servers.get(req.params.id)
        
        if(!server) {
            send({
                error: "Server Not Found", 
                code: "SERVER_NOT_FOUND",
            })
        } else {
            const [code, granted] = req.user.requirePermission("servers.view", { resourceId: server.id })
            if(!granted) return NO_PERMISSION(reply, 
                "Cannot access server, no permission", 
                code,
            )

            function eventHandler(record?: LiveRecord) {
                if(record)
                    send(record)
                else
                    send({ state: "EXIT" })
            }

            const heartbeatTimer = setInterval(() => {
                reply.raw.write(': heartbeat\n\n')
            }, 1000 * 15)

            server.addListener("live", eventHandler)
            server.emit("live:subscribe", true)
            req.raw.on("close", () => {
                server.removeListener("live", eventHandler)
                server.emit("live:subscribe", false)
                clearTimeout(heartbeatTimer)
            })

        }
        reply.hijack()
    })

    fastify.get('/:id/status', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply) => {

        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server", code)

        let recentActivities = null
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
            recentActivities = rows
        }

        let stats = null
        try {
            await server.refresh(true, false)
        } catch(err) {
            
        }

        return {
            recentActivities, 
            stats,
            uptime: server.uptime,
            status: server.status,
        }
    })

    fastify.get('/:id/generate-jwt', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        const [code, granted] = req.user.requirePermission("servers.generate_jwt", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to generate a JWT for this server", code)
        const token = await JWT.sign({
            sub: server.id,
            iat: Math.round(Date.now()/1000)
        }, JWT_SECRET)
        reply.header("Content-Type", "text/plain")
        return reply.code(200).send(token)
    })


    fastify.post('/:id/start', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        const [code, granted] = req.user.requirePermission("servers.action.builtin.start", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to start this server", code)
        if(!server.hasSystemd) {
            return reply.code(400).send({
                error: "NO_SYSTEMD",
                message: "Server has no valid configuration for automatic state management."
            })
        }
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

    fastify.post('/:id/action/:action', async(req: FastifyRequest<{Params: { id: string, action: string }, Querystring: { args: string } }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")

        if(!server.SocketConnected) {
            return reply.status(503).send({
                error: "SERVER_UNAVAILABLE",
                message: "Server is not connected to the panel."
            })
        }

        let namespace = "default"
        let command: string = req.params.action
        const split = req.params.action.split(":")
        if(split.length > 1) {
            [namespace, command] = split
        }

        const [code, granted] = req.user.requirePermission(`servers.plugin.${namespace}.${command}` as UserPrivilegeCode, { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, undefined, code)

        await req.user.log(null, `%client% ran action %namespace%:%command%`, {
            code,
            metadata: {
                namespace,
                command
            }
        })
        const args = req.query.args ? req.query.args.split(",") : []
        try {
            const response = await server.performAction(command, namespace, args)
            return {
                id: response.id,
                resultType: response.resultType,
                result: response.result,
                message: response.message
            }
        } catch(err) {
            return reply.code(500).send({
                error: "COMMAND_FAILED",
                message: "Command failed to run:\n" + err,
            })
        }
    })

    fastify.post('/:id/cmd', async(req: FastifyRequest<{Params: { id: string }, Querystring: {'no-response'?: boolean}, Body: string }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")
        
        if(req.body.includes("rcon_password"))
            return NO_PERMISSION(reply, "You do not have permission to run that command")
        const [code, granted] = req.user.requirePermission("servers.plugin.default." + req.params.id as UserPrivilegeCode, { resourceIds: [server.id] })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to run commands on this server", code)

        if(!server.hasPlugin) {
            return reply.code(400).send({
                error: "NO_PLUGIN",
                message: "Server has not been setup to run commands"
            })
        }

        const id = await req.user.log(null, `%client% ran command %cmd% on %server%`, {
            code,
            metadata: {
                server: server.id,
                cmd: req.body
            }
        })
        await fastify.authmngr.notifyAdmins(`Admin ${req.user.steamid2} ran server command \"${req.body}\" on server ${server.id}. Log entry: ${id}`, "notify_rcon_use")
        const response = await server.performAction(req.body, "default")
        if(req.query['no-response'])
            return reply.status(204).send()
        else return {
            id: response.id,
            resultType: response.resultType,
            result: response.result,
            message: response.message
        }
    })

    fastify.post('/:id/stop', async(req: FastifyRequest<{Querystring: { force?: boolean }, Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        const [code, granted] = req.user.requirePermission(req.query.force ? "servers.action.builtin.stop" : "servers.action.builtin.request_stop", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to stop this server", code)
        if(!server.hasPlugin) {
            return reply.code(400).send({
                error: "NO_PLUGIN",
                message: "Server has not been setup to run commands"
            })
        }
        try {
            await server.stop(req.query.force)
            // If not systemd, hope server auto restarts
            if(server.hasSystemd) {
                try {
                    await server.start()
                } catch(err) {
                    return reply.code(500).send({
                        error: "SERVER_ERROR",
                        message: "Server returned an error on startup: " + err.message,
                        code: 500
                    })
                }
            }
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
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.status(404).send({
                error: "Server Not Found", 
                code: "SERVER_NOT_FOUND",
            })
        }
        const [code, granted] = req.user.requirePermission("servers.view_console", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view the server console", code)

        return server.logs.join("\n")
    })

    fastify.get('/:id/logs/sse', async (req: FastifyRequest<{ Params: { id: 'string' } }>, reply) => {
        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        reply.raw.flushHeaders()
        function eventHandler(line: string) {
            reply.raw.write(`data: ${encodeURIComponent(line)}\n\n`)
        }
        let failed = false
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            failed = true
            eventHandler(`Unknown server`)
        }
        const [code, granted] = req.user.requirePermission("servers.view_console", { resourceId: server.id })
        console.log(code, granted, req.user.permCodes)
        if(!granted) {
            failed = true
            eventHandler(`You do not have permission to view the server console.`)
        }
        
        if(!failed) {
            // Send any stale data:
            for(const line of server.logs) {
                eventHandler(line)
            }

            const heartbeatTimer = setInterval(() => {
                reply.raw.write(': heartbeat')
            }, 1000 * 30)

            server.on('log', eventHandler)
            req.raw.on("close", () => {
                server.removeListener("live", eventHandler)
                clearTimeout(heartbeatTimer)
            })
        }
        reply.hijack()
    })
}

const sleep = (time: number) => new Promise(res => setTimeout(res, time));
