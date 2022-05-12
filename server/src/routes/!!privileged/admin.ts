import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import util from 'util'
import { exec, PromiseWithChild } from 'child_process';
import { WebPermission } from '../../../../common-types/User.js';
import { unlink } from 'fs/promises';
import path from 'path'
const execPromise = util.promisify(exec);

export type UpdateState = "NORMAL" | "GIT_PULL" | "UNLINK_NODE_MODULES" | "TSC" | "RESTARTING"
let updateState: UpdateState = "NORMAL"

export interface HealthReport {
    currentState: UpdateState,
    uptime: number
    pid: number,
    versions: {
        fastify: string,
        node: string
    },
    memoryPercentage: number
}


export default async function routes(fastify: FastifyInstance, opts: FastifyPluginOptions)  {
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

    fastify.all('/update', async(req, reply) => {
        if(req.session.permissions.web.flags & WebPermission.FullPermission) {
            
            if(updateState === "NORMAL") {
                let response = { stdout: "", stderr: "" }

                async function doState(state: UpdateState, promise: Promise<any>) {
                    const startTime = Date.now()
                    updateState = state
                    req.log.info(`Updater: starting stage ${state}`)
                    response = await promise
                    return Date.now() - startTime
                }

                try {
                    const timeGitPull = await doState("GIT_PULL", execPromise('git pull'))
                    let timeRmNodeModules = null
                    if(response.stdout.includes("Already up to date.")) {
                        updateState = "NORMAL"
                        return reply.status(200).send({
                            success: false,
                            reason: 'UP_TO_DATE',
                            message: response.stdout
                        })
                    }

                    if(process.env.NODE_ENV === "production") {
                        timeRmNodeModules = await doState(
                            "UNLINK_NODE_MODULES", 
                            unlink(path.join(process.cwd(), 'node_modules'))
                        )
                    }
                    const timeTsc = await doState("TSC", execPromise('tsc'))

                    updateState = "RESTARTING"

                    await reply.send({
                        success: true,
                        meta: {
                            timeGitPull,
                            timeRmNodeModules,
                            timeTsc,
                            timeTotal: timeGitPull + timeRmNodeModules + timeTsc
                        }
                    })

                    await fastify.close()
                    process.exit()
                } catch(err) {
                    reply.code(500).send({
                        error: "UPDATE_ERROR",
                        message: err.message,
                        stderr: err.stderr,
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
        } else {
            return reply.code(401).send({
                error: "UNAUTHORIZED",
                message: "You do not have permission to update the api server"
            })
        }
    })
}