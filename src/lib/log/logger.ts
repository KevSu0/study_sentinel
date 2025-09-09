import pino, { LoggerOptions } from 'pino'

const isProd = process.env.NODE_ENV === 'production'

import { REDACT_PATHS } from './redaction-rules'

const baseConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  redact: {
    paths: [...REDACT_PATHS],
    remove: true,
  },
  base: {
    env: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME || 'study_sentinel',
  },
}

// Pretty transport in development for local readability
const transport = !isProd
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    }
  : undefined

export const logger = pino({ ...baseConfig, transport })

export type AppLogger = typeof logger

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings)
}
