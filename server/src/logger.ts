import pino from 'pino';
import { mkdir } from 'fs'

mkdir("logs", (e) => {})


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
        // {
        //   level: 'debug',
        //   target: "pino/file",
        //   options: {
        //     destination: process.env.LOG_PATH || "logs/output.log",
        //   },
        // }
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
        },
        {
          level: 'debug',
          target: "pino/file",
          options: {
            destination: process.env.LOG_PATH || "/var/log/admin-panel.log",
          },
        }
      ]
    },
  },
  test: false,
}

const logger = pino(envToLogger[process.env.NODE_ENV ?? "development"]);


export default logger;
