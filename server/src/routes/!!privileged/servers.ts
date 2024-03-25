import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { NO_PERMISSION, NOT_FOUND } from '../../responses.js';
import JWT from '../../jwt-promise.js'
import { PlayerAction, ServerData } from '../../../../common-types/Server.js';
import { LiveRecord, LiveRecordType } from '../../../../common-types/Live.js';
    
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

    fastify.get('/:id', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server (code: " + code + ")", code)


        return {
            info: server.info
        }
    })

    fastify.get('/:id/data', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply): Promise<ServerData> => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        const [code, granted] = req.user.requirePermission("servers.view", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to view this server", code)

        let playerJoins = null
        if(server.activityLogId) {
            [playerJoins] = await fastify.db.execute(
                "SELECT server, type, timestamp, COUNT(*) as count FROM activity_log WHERE server = ?  AND type = 'JOIN'AND FROM_UNIXTIME(timestamp) >= (NOW() - INTERVAL 1 MONTH) GROUP BY DATE(FROM_UNIXTIME(timestamp)), HOUR(FROM_UNIXTIME(timestamp)) order by timestamp DESC",
                [server.activityLogId]
            )
        }
        const configs = req.user.hasPermission("servers.configs.read", server.id) ? await server.getConfigFiles() : undefined
        return {
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

    fastify.post('/:id/start', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        const [code, granted] = req.user.requirePermission("servers.cmds.start", { resourceId: server.id })
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

    fastify.post('/:id/cmd', async(req: FastifyRequest<{Params: { id: 'string'}, Querystring: {'no-response'?: boolean}, Body: string }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")
        
        if(req.body.includes("rcon_password"))
            return NO_PERMISSION(reply, "You do not have permission to run that command")
        const [code, granted] = req.user.requirePermission("servers.rcon", { resourceIds: [server.id] })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to run commands on this server", code)

        if(!server.hasRcon) {
            return reply.code(400).send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }

        try {
            const id = await req.user.log(null, `%client% ran command %cmd%`, {
                code,
                metadata: {
                    cmd: req.body
                }
            })
            await fastify.authmngr.notifyAdmins(`Admin ${req.user.steamid2} ran rcon command \"${req.body}\" on server ${server.id}. Log entry: ${id}`, "notify_rcon_use")
            const response = await server.sendCommand(req.body)
            if(req.query['no-response'])
                return reply.status(204).send()
            else return response
        } catch(err) {
            return reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error: " + err.message,
                code: 500
            })
        }
    })

    fastify.post('/:id/players/:action', async(req: FastifyRequest<{Params: { id: 'string', action: 'string'}, Querystring: { userId?: string, steamid?: string } }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) return NOT_FOUND(reply, "Server")
        
        // TODO: diff permission code
        const [code, granted] = req.user.requirePermission("servers.rcon", { resourceIds: [server.id, req.params.action] })
        if(!granted) return NO_PERMISSION(reply, "You do not have permissions to run commands on this server", code)

        if(!server.hasRcon) {
            return reply.code(400).send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }

        const targetUser = fastify.authmngr.getAdmin(req.query.steamid)
        if(targetUser && targetUser.permissions.immunityLevel > req.user.immunity) {
            return NO_PERMISSION(reply, "You do not have permisson to perform actions on this user", code)
        }
        
        await req.user.log(null, `%client% performed action %action% to %steamid% on %server%`, {
            code,
            metadata: {
                server: server.id,
                action: req.params.action,
                steamid: req.query.steamid,
                arguments: {...req.query as Record<string, string>} 
            }
        })

        try {
            await server.performAction(req.params.action as PlayerAction, req.query.steamid, req.query as Record<string, string>)
            reply.status(204).send()
        } catch(err) {
            return reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error: " + err.message,
                code: 500
            })
        }
    })

    fastify.post('/:id/stop', async(req: FastifyRequest<{Querystring: { force?: boolean }, Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        const [code, granted] = req.user.requirePermission("servers.cmds.start", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to stop this server", code)
        if(!server.hasRcon) {
            return reply.code(400).send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
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

    fastify.post('/:id/restart', async(req: FastifyRequest<{Querystring: { force?: boolean, sse?: boolean }, Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        // We will allow users to restart IF they can start, allowing them to stop it kinda
        // But if they force it, they will need stop permission too
        if(req.query.force) {
            const [code, granted] = req.user.requirePermission("servers.cmds.stop", { resourceId: server.id })
            if(!granted) return NO_PERMISSION(reply, "You do not have permission to force stop this server", code)
        }
        const [code, granted] = req.user.requirePermission("servers.cmds.start", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to start this server", code)

        if(!server.hasRcon) {
            return reply.code(400).send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }
        try {
            return { response: await server.stop(req.query.force) }
        } catch(err) {
            console.log('error', err)
            return reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error: " + err.message,
                code: 500
            })
        }
    })
    
    fastify.get('/:id/restart/sse', async(req: FastifyRequest<{Querystring: { force?: boolean }, Params: { id: 'string'} }>, reply) => {
        reply.raw.writeHead(200, {
            'Cache-Control': 'no-cache,no-transform',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        function send(msg: any) {
            reply.raw.write(`data: ${JSON.stringify(msg)}\n\n`)
        }
        reply.raw.flushHeaders()
        reply.raw.write('retry: 10000\n\n')
        const server = fastify.servers.get(req.params.id)
        
        if(!server) {
            send({
                error: "SERVER_NOT_FOUND",
                message: "Server Not Found", 
            })
        }
        if((req.query.force && !req.user.hasPermission("servers.cmds.stop", server.id)) 
            || !req.user.hasPermission("servers.cmds.start", server.id)
        ) return send({error: "NO_PERMISSION", message: "You are not authorized to access this resource"})

        if(!server.hasRcon) {
            send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }
        try {
            const response = await server.stop(req.query.force)
            if(!req.query.force && !response) {
                send({
                    error: "PLAYERS_ONLINE",
                    message: "There are players are online"
                })
            } else {
            send({ state: "restarting" })
                let timeout = 30_000
                let waitingState = "before_offline"
                while(timeout > 0) {
                    await server.refresh()
                    if(waitingState === "before_offline") {
                        if(!server.status.online) {
                            // Wait for server to go offline
                            waitingState = "server_offline"
                            send({ state: waitingState })
                        }
                    } else if(waitingState === "server_offline") {
                        if(server.status.online) {
                            // Now server went offline, wait for it to go online
                            waitingState = "done"
                            send({ state: waitingState })
                            break
                        }
                    }
                    timeout -= 1000
                    await sleep(1000)
                }
                if(timeout == 0) {
                    send({ 
                        error: "RESTART_CHECK_TIMEOUT",
                        message: "Timed out while waiting for server to restart"
                    })
                }
            }
        } catch(err) {
            console.log('error', err)
            if(err.code === "ETIMEDOUT") {
                send({
                    error: "CONNECTION_TIMED_OUT",
                    message: "Could not reach server in time"
                })
            } else {
                send({
                    error: "UNKNOWN_ERROR",
                    message: "An unknown error occurred"
                })
            }
        }
        reply.hijack()
        // Timeout if they haven't killed it
        setTimeout(() => reply.raw.end(), 60_000)
    })

    fastify.post('/:id/unreserve', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) NOT_FOUND(reply, "Server")
        const [code, granted] = req.user.requirePermission("servers.cmds.unreserve", { resourceId: server.id })
        if(!granted) return NO_PERMISSION(reply, "You do not have permission to unreserve this server", code)
        if(!server.hasRcon) {
            return reply.code(400).send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }
        try {
            return { response: await server.sendCommand("sm_unreserve") }
        } catch(err) {
            console.log('error', err)
            return reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error: " + err.message,
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
        const [code, granted] = req.user.requirePermission("servers.rcon", { resourceId: server.id })
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
        const [code, granted] = req.user.requirePermission("servers.rcon", { resourceId: server.id })
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
