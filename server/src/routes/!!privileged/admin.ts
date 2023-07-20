import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { exec } from 'child_process';
import { rm, unlink } from 'fs/promises';
import path from 'path'
import { NO_PERMISSION } from '../../responses.js';
import { UpdateState } from '../../../../common-types/Panel.js';
// const execPromise = util.promisify(exec);

let updateState: UpdateState = "NORMAL"

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
        if(!req.user.hasPermission("panel.update")) return NO_PERMISSION(reply)
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
                let timeRmNodeModules = null
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

                const timeTsc = await doExec("TSC", 'tsc')

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
            console.warn(error);
        }
            resolve({
                stdout,
                stderr
            });
        });
    });
}