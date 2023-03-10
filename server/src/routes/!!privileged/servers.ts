import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Static, Type } from '@sinclair/typebox'
import SteamID from 'steamid'
import { WebPermission } from '../../../../common-types/User.js';
import { join } from 'path';
import { readFile } from 'fs/promises';
    
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

    fastify.get('/:id', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }

        const configs = fastify.authmngr.hasPermission(req, WebPermission.ConfigRead) ? await server.getConfigFiles() : undefined

        return {
            info: server.info,
            cvars: server.cvars,
            configs
        }
    })

    fastify.get('/:id/configs', async(req: FastifyRequest<{Params: { id: 'string' }, Querystring: { path: 'string', raw?: boolean }}>, reply) => {
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
        } else if(!fastify.authmngr.hasPermission(req, WebPermission.ConfigRead)) {
            return reply.code(403).send({ 
                error: "NO_PERMISSION",
                message: "You are not authorized to access this resource"
            })
        } else if(req.query.raw && !fastify.authmngr.hasPermission(req, WebPermission.ConfigRawView)) {
            return reply.code(403).send({ 
                error: "NO_PERMISSION",
                message: "You are not authorized to access the raw contents of this resource"
            })
        }

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
                                value: '**HIDDEN**'
                            })
                            continue
                        }
                        let cvar = null
                        if(command === "sm_cvar" && split.length > 2) {
                            cvar = split.shift()
                        }
                        const value = split.join(" ").trim()
                        records.push({ 
                            command,
                            value,
                            cvar,
                            type: isNaN(Number(value)) ? "string" : "number" //value.startsWith('"') && value.endsWith('"') ? 'string' : 'number'
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

    fastify.get('/:id/status', async(req: FastifyRequest<{Params: { id: 'string' }}>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        let recentActivities = null
        console.log(server.id, server.activityLogId)
        if(server.activityLogId) {
            const [rows] = await fastify.db.execute<RowDataPacket[]>("SELECT *, s1.last_alias as clientName, s2.last_alias as targetName FROM activity_log LEFT JOIN stats_users as s1 ON s1.steamid = client LEFT JOIN stats_users as s2 ON s2.steamid = target WHERE server = ? ORDER BY timestamp DESC LIMIT 5 ", [server.activityLogId])
            recentActivities = rows
        }
        let stats = null
        try {
            await server.refresh(true, true)
            stats = await server.getStats()
        } catch(err) {

        }

        return {
            recentActivities, 
            stats,
            status: server.status
        }
    })

    fastify.post('/:id/start', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
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

    fastify.post('/:id/cmd', async(req: FastifyRequest<{Params: { id: 'string'}, Body: string }>, reply) => {
        // rcon access
        if(~req.session.permissions.web.flags & WebPermission.RconAccess) {
            return reply.code(403).send({ 
                error: "NO_PERMISSION",
                message: "You are not authorized to access this resource"
            })
        }
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
        if(!server.hasRcon) {
            return reply.code(400).send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }

        try {
            await server.sendCommand(req.body)
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
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
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
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
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
    fastify.post('/:id/restart/sse', async(req: FastifyRequest<{Querystring: { force?: boolean }, Params: { id: 'string'} }>, reply) => {
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
                error: "Server Not Found", 
                code: "SERVER_NOT_FOUND",
            })
        }
        if(!server.hasRcon) {
            send({
                error: "NO_RCON",
                message: "Server does not have rcon setup"
            })
        }
        try {
            send({ response: await server.stop(req.query.force) })
            let timeout = 30_000
            let waitingState = 1
            while(timeout > 0 && waitingState != 0) {
                await server.refresh()
                if(waitingState == 1 && !server.status.online) {
                    // Wait for server to go offline
                    send({ state: server.status.online, waitingState })
                    waitingState = 2
                } else if(waitingState == 2 && server.status.online) {
                    // Now server went offline, wait for it to go online
                    send({ state: server.status.online, waitingState })
                    waitingState = 0
                }
                timeout -= 1000
                await sleep(1000)
            }
            if(timeout > 0)
                send({ success: true })
            else
                send({ 
                    code: "RESTART_CHECK_TIMEOUT",
                    error: "Restart Check Time out",
                    message: "Timed out while waiting for server to restart"
                })
        } catch(err) {
            console.log('error', err)
            reply.code(500).send({
                error: "SERVER_ERROR",
                message: "Server returned an error: " + err.message,
                code: 500
            })
        }
        reply.hijack()
        // Timeout if they haven't killed it
        setTimeout(() => reply.raw.end(), 60_000)
    })

    fastify.post('/:id/unreserve', async(req: FastifyRequest<{Params: { id: 'string'} }>, reply) => {
        const server = fastify.servers.get(req.params.id)
        if(!server) {
            return reply.code(404).send({
                error: "SERVER_NOT_FOUND",
                message: "Server not found"
            })
        }
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
}

const sleep = time => new Promise(res => setTimeout(res, time));
