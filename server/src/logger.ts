import pino from 'pino';
import path from 'path'
import {  mkdirSync, writeFileSync } from 'fs'

const envToLogger = {
  development: {
    transport: {
      targets: [
        {
          level: process.env.LOG_LEVEL || 'debug',
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:hh:MM',
            ignore: 'pid,hostname,time',
          },
        }
      ]
    },
    level: process.env.LOG_LEVEL || 'debug'
  },
  production: {
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers.authorization', "req.headers['x-apikey']"],
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

const LOG_TO_FILE = Number(process.env.LOG_TO_FILE) || 1
const logObj = envToLogger[process.env.NODE_ENV ?? "development"]
if(process.env.LOG_PATH && LOG_TO_FILE) {
  // make 'logs' folder, ignore if it already exists
  const folder = path.parse(process.env.LOG_PATH).dir || "logs"
  try {
    mkdirSync(folder, { recursive: true })
  } catch(err) {
    if(err.code != "EEXISTS") {
      console.error(`logger: failed to make logs folder "${folder}"`, err)
      throw err
    }
  } 

  if(process.env.LOG_WIPE_PREVIOUS) {
    writeFileSync(process.env.LOG_PATH, "")
  }
  logObj.transport.targets.push({
    level: 'debug',
    target: "pino/file",
    options: {
      destination: process.env.LOG_PATH,
    },
  })
  console.debug("logging to", folder, process.env.LOG_PATH)
}
const logger = pino(logObj);


export default logger;
