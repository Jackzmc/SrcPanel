import pino from 'pino';
import { mkdir } from 'fs'

const envToLogger = {
  development: {
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:hh:MM',
            ignore: 'pid,hostname',
          },
        }
      ]
    },
    level: process.env.FASTIFY_DEBUG_LEVEL || 'debug'
  },
  production: {
    level: process.env.FASTIFY_DEBUG_LEVEL || 'warn',
    redact: ['req.headers.authorization', 'req.headers.x-apikey'],
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:hh:MM',
            ignore: 'pid,hostname',
          },
        }
      ]
    },
  },
  test: false,
}

const logObj = envToLogger[process.env.NODE_ENV ?? "development"]
if(process.env.LOG_PATH) {

  mkdir("logs", (e) => {})
  logObj.transport.targets.push({
    level: 'debug',
    target: "pino/file",
    options: {
      destination: process.env.LOG_PATH,
    },
  })
  console.debug("logging to", process.env.LOG_PATH)
}
const logger = pino(logObj);


export default logger;
