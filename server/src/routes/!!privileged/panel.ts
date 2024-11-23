import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { ConfigKey, FirstTimeSetupStage, KVConfig, KeyConfig, KeyFlags } from '../../../../common-types/Panel.js';
import { NO_PERMISSION } from '../../responses.js';
import path from 'node:path';
import Json5 from 'json5'
import { readFile, writeFile } from 'node:fs/promises';
import { exec } from 'child_process';
import { UpdateState } from '../../../../common-types/Panel.js';
import { rm, unlink } from 'fs/promises';
import Server from '../../modules/servers/Server.js';

let updateState: UpdateState = "NORMAL"

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async (req, reply) => {
        if(!req.user!.hasPermission("panel.view")) return NO_PERMISSION(reply)
        let kv = {}
        for(const [key, config] of Object.entries(KVConfig)) {
            if(config.flags && config.flags & ~KeyFlags.Internal) {
                kv[key] = {
                    ...config,
                    value: await fastify.config.GetKV(key as ConfigKey, "")
                }
            }
        }
        
        return {
            keys: kv
        }
    })

    fastify.get('/config/:filename', async (req: FastifyRequest<{ Params: { filename: string }}>, reply) => {
        try {
            let content = await readFile(path.resolve('config/', req.params.filename), 'utf-8') 
            content = Json5.parse(content)
            return reply.send(content)
        } catch(err: any) {
            if(err.code === "ENOENT")
                return reply.status(404).send()
            throw err
        }
    })

    fastify.post('/config/:filename', async (req: FastifyRequest<{ Params: { filename: string }}>, reply) => {
        try {
            const prettyJson = JSON.stringify(req.body, null, 2)
            await writeFile(path.resolve('config/', req.params.filename), prettyJson,  { encoding: 'utf-8' })
            return reply.code(204).send()
        } catch(err: any) {
            if(err.code === "ENOENT")
                return reply.status(404).send()
            throw err
        }
    })

    fastify.post('/kv', async (req, reply) => {
        if(!req.user!.hasPermission("panel.manage")) return NO_PERMISSION(reply)
        if(req.headers['content-type']?.toLowerCase() !== "application/json") {
            return reply.status(400).send({
                error: "INVALID_BODY",
                message: "The body of the request must be a json object of key value pairs"
            })
        }


        for(const [key, value] of Object.entries(req.body as Record<string, any>)) {
            if(!(key in KVConfig)) {
                return reply.status(400).send({
                    error: "UNKNOWN_KV",
                    message: `The key "${key}" is not a valid keyvalue key`
                })
            }

            await fastify.config.SetKV(key as ConfigKey, value)
        }

        return reply.status(204).send()
    })

    fastify.get('/health', async(req, reply) => {
        return {
            currentState: updateState,
            uptime: process.uptime(),
            pid: process.pid,
            versions: {
                fastify: fastify.version,
                node: process.versions.node,
            },
            memoryPercentage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
        }
    })

    fastify.post('/update', async(req, reply) => {
        if(!req.user!.hasPermission("panel.update")) return NO_PERMISSION(reply)
        console.log('cwd', process.cwd())
        if(updateState === "NORMAL") {
            let response = { stdout: "", stderr: "" }

            async function doState(state: UpdateState, promise: Promise<any>) {
                const startTime = Date.now()
                updateState = state
                fastify.log.info(`Updater: starting stage ${state}`)
                response = await promise
                return Date.now() - startTime
            }
            async function doExec(state: UpdateState, command: string) {
                console.log(`running: [${state}] ${command}`)
                return doState(state, execPromise(command))
            }

            try {
                const timeGitPull = await doExec("GIT_PULL", 'git pull')
                let timeRmNodeModules: number = 0
                if(response.stdout.includes("Already up to date.")) {
                    updateState = "NORMAL"
                    return reply.status(200).send({
                        success: false,
                        reason: 'UP_TO_DATE',
                        message: response?.stdout
                    })
                }

                if(process.env.NODE_ENV === "production") {
                    timeRmNodeModules = await doState(
                        "UNLINK_NODE_MODULES", 
                        rm(path.join(process.cwd(), 'node_modules'), { recursive: true, force: true})
                    )
                }

                const timePackagesInstall = await doExec("PACKAGES_INSTALL", "yarn install")

                await doState("CLEANUP_OLD_BUILD", rm(path.join(process.cwd(), 'dist'), {
                    recursive: true,
                    force: true
                }))

                const timeTsc = await doExec("TSC", 'npx tsc')

                updateState = "RESTARTING"

                const timeMeta = {
                    timeGitPull,
                    timeRmNodeModules,
                    timePackagesInstall,
                    timeTsc,
                    timeTotal: timeGitPull + timeRmNodeModules + timeTsc
                }

                console.log(timeMeta)

                await reply.send({
                    success: true,
                    meta: timeMeta
                })

                await fastify.close()
                process.exit()
            } catch(err) {
                console.error(`[Updater] Update failed on ${updateState}: `, err)
                fastify.log.error(response)
                reply.code(500).send({
                    ...response,
                    error: "UPDATE_ERROR",
                    message: err.message,
                    state: updateState
                })
                updateState = "NORMAL"
            }
        } else {
            reply.code(409).send({
                error: "ALREADY_UPDATING",
                message: "Server is already updating.",
                state: updateState
            })
        }
    })

    fastify.post('/restart', async (req, reply) => {
        if(!req.user!.hasPermission("panel.restart")) return NO_PERMISSION(reply)
        await reply.status(204).send()
        await fastify.close()
        process.exit()
    })

    fastify.post('/update-admins', async (req, reply) => {
        await fastify.authmngr.refreshAdmins()
        await reply.status(204).send()
    } )
    
    fastify.get('/groups', async ( req, reply ) => {
        // if(!req.user.hasPermission("panel.restart")) return NO_PERMISSION(reply)
        const groups = fastify.servers.Groups
        return reply.send(groups)
    })

    fastify.delete('/groups/:id', async (req: FastifyRequest<{ Params: { id: string }}>, reply) => {
        // await fastify.servers.deleteGroup(req.params.id)
        // const group = await fastify.server
    })

    fastify.put('/groups/:id', async (req: FastifyRequest<{ Params: { id: string }}>, reply) => {
        // await fastify.servers.setGroup(req.params.id, req.body)
    })

    fastify.get('/servers', async (req, reply) => {
        return fastify.servers.getAllGrouped((server: Server) => {
            return {
                id: server.id,
                name: server.name,
                host: server.host,
                ip: server.ip,
                port: server.port,
                type: server.type,
                tags: server.tags,
                features: server.features,
                domain: server.host,
                actions: server.actions.filter(a => !a.inherited)
            }
        })
    })

    fastify.get('/first-time-setup', async(req: FastifyRequest, reply ) => {
        return {
            stage: Number(await fastify.config.GetKV<number>("first-time-setup.stage", 0))
        }
    })

    fastify.post('/first-time-setup', async(req: FastifyRequest<{ Querystring: { stage: number, [s: string]: any }}>, reply ) => {
        const stage = Number(req.query.stage)
        const currentStage = await fastify.config.GetKV<number>("first-time-setup.stage", 0)
        if(currentStage == FirstTimeSetupStage.DONE) return reply.code(403).send({
            error: "SETUP_COMPLETE",
            message: "Setup has already been completed"
        })
        if(stage === FirstTimeSetupStage.FirstSetupComplete) {
            console.log("setting domain", req.query.domain)
            // await fastify.config.SetKV("domain", req.query.domain)
        } else {
            return reply.code(400).send({
                error: "INVALID_STAGE",
                message: "Invalid stage"
            })
        }
        await fastify.config.SetKV("first-time-setup.stage", stage)
        return reply.status(204).send()
    })
}

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execPromise(cmd: string): Promise<{ stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
                console.warn("execPromise", error);
                return reject({
                    stdout,
                    stderr
                });
            }
            resolve({
                stdout,
                stderr
            });
        });
    });
}