/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev =
  typeof process !== 'undefined'
    ? process.env.NODE_ENV !== 'production'
    : false

const emit = (level: LogLevel, scope: string, args: unknown[]) => {
  const prefix = `[${scope}]`
  switch (level) {
    case 'debug':
      if (isDev) console.debug(prefix, ...args)
      break
    case 'info':
      console.info(prefix, ...args)
      break
    case 'warn':
      console.warn(prefix, ...args)
      break
    case 'error':
      console.error(prefix, ...args)
      break
  }
}

export const createLogger = (scope: string) => ({
  debug: (...args: unknown[]) => emit('debug', scope, args),
  info: (...args: unknown[]) => emit('info', scope, args),
  warn: (...args: unknown[]) => emit('warn', scope, args),
  error: (...args: unknown[]) => emit('error', scope, args)
})

export type Logger = ReturnType<typeof createLogger>

