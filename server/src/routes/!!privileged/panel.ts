import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { NO_PERMISSION } from '../../responses.js';
import path from 'node:path';
import { UpdateState } from '../../../../common-types/Panel.js';
import { rm } from 'fs/promises';
import Server from '../../modules/servers/Server.js';
import { CustomServerGroup } from '../../modules/servers/groups/CustomServerGroup.js';
import { DynamicServerGroup } from '../../modules/servers/groups/DynamicServerGroup.js';
import { exec } from 'node:child_process';

let updateState: UpdateState = "NORMAL"

export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.get('/', async (req, reply) => {
        if(!req.user!.hasPermission("panel.view")) return NO_PERMISSION(reply)
        return fastify.config.Config
    })

    fastify.post('/recreate-servers', async (req: FastifyRequest, reply) => {
        for(const group of fastify.servers.Groups) {
            if(group instanceof CustomServerGroup || group instanceof DynamicServerGroup) {
                await group.recreateServers()
            }
        }
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
    
    fastify.get('/jobs', async(req, reply) => {
        const jobs = fastify.jobs.getNamedTasks()
        return {
            jobs
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

    fastify.post('/reload-config', async (req, reply) => {
        try {
            await fastify.config.Reload()
            return reply.status(204).send() 
        } catch(err) {
            fastify.log.error("Reload failed: " + err)
            return reply.status(500).send({
                error: "RELOAD_FAILED",
                message: err.message
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
                type: server.game,
                tags: server.tags,
                features: server.features,
                domain: server.host,
                actions: server.actions.filter(a => !a.inherited)
            }
        })
    })

    fastify.get('/first-time-setup', async(req: FastifyRequest, reply ) => {
        return {
            stage: -1
        }
    })

    fastify.post('/first-time-setup', async(req: FastifyRequest<{ Querystring: { stage: number, [s: string]: any }}>, reply ) => {
        // const stage = Number(req.query.stage)
        // const currentStage = await fastify.config.GetKV<number>("first-time-setup.stage", 0)
        // if(currentStage == FirstTimeSetupStage.DONE) return reply.code(403).send({
        //     error: "SETUP_COMPLETE",
        //     message: "Setup has already been completed"
        // })
        // if(stage === FirstTimeSetupStage.FirstSetupComplete) {
        //     console.log("setting domain", req.query.domain)
        //     // await fastify.config.SetKV("domain", req.query.domain)
        // } else {
        //     return reply.code(400).send({
        //         error: "INVALID_STAGE",
        //         message: "Invalid stage"
        //     })
        // }
        // await fastify.config.SetKV("first-time-setup.stage", stage)
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