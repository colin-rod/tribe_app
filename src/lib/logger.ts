/**
 * Centralized Logging System
 * Provides structured logging with levels, context, and proper error handling
 */

// Global type declarations for external services
declare global {
  interface Window {
    Sentry?: {
      captureMessage: (message: string, options?: {
        level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
        contexts?: Record<string, unknown>
        extra?: Record<string, unknown>
      }) => void
    }
  }
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  userId?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
  timestamp?: Date
  stack?: string
}

export interface LogEntry {
  level: LogLevel
  message: string
  context: LogContext
  timestamp: Date
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private enableConsole: boolean
  private enableRemote: boolean
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 100

  private constructor() {
    // Enhanced production log filtering with environment variable override
    const configLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL
    
    if (configLogLevel) {
      // Allow explicit log level configuration
      const levelMap: Record<string, LogLevel> = {
        'DEBUG': LogLevel.DEBUG,
        'INFO': LogLevel.INFO,
        'WARN': LogLevel.WARN, 
        'ERROR': LogLevel.ERROR,
        'FATAL': LogLevel.FATAL
      }
      this.logLevel = levelMap[configLogLevel.toUpperCase()] || LogLevel.INFO
    } else {
      // Default: DEBUG in development, WARN in production
      this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
    }
    
    this.enableConsole = process.env.NODE_ENV !== 'production' || 
                        process.env.ENABLE_CONSOLE_LOGS === 'true'
    this.enableRemote = process.env.NODE_ENV === 'production' || 
                       process.env.ENABLE_REMOTE_LOGS === 'true'
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  private createLogEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      level,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      timestamp: new Date()
    }
  }

  private formatMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level]
    const timestamp = entry.timestamp.toISOString()
    const component = entry.context.component ? `[${entry.context.component}]` : ''
    const action = entry.context.action ? `${entry.context.action}:` : ''
    
    return `${timestamp} ${levelName} ${component} ${action} ${entry.message}`
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.enableConsole) return

    const formatted = this.formatMessage(entry)
    const metadata = entry.context.metadata ? entry.context.metadata : {}

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted, metadata)
        break
      case LogLevel.INFO:
        console.info(formatted, metadata)
        break
      case LogLevel.WARN:
        console.warn(formatted, metadata)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted, metadata)
        if (entry.context.stack) {
          console.error('Stack trace:', entry.context.stack)
        }
        break
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize)
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.enableRemote) return

    try {
      // Multiple external service integrations
      const promises: Promise<void>[] = []
      
      // Custom logging endpoint
      const logEndpoint = process.env.NEXT_PUBLIC_LOG_ENDPOINT || process.env.LOG_ENDPOINT
      if (logEndpoint) {
        promises.push(
          fetch(logEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...entry,
              timestamp: entry.timestamp.toISOString(),
              service: 'tribe-app',
              version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
            })
          }).then(response => {
            if (!response.ok) {
              throw new Error(`Log endpoint responded with ${response.status}`)
            }
          })
        )
      }
      
      // Sentry integration (if SENTRY_DSN is configured)
      if (typeof window !== 'undefined' && window.Sentry && entry.level >= LogLevel.ERROR) {
        const sentry = window.Sentry
        promises.push(
          Promise.resolve().then(() => {
            sentry.captureMessage(entry.message, {
              level: entry.level === LogLevel.ERROR ? 'error' : 'fatal',
              contexts: {
                logger: {
                  component: entry.context.component,
                  userId: entry.context.userId,
                  metadata: entry.context.metadata
                }
              },
              extra: entry.context as Record<string, unknown>
            })
          })
        )
      }

      // Execute all logging attempts
      if (promises.length > 0) {
        await Promise.allSettled(promises)
      }
    } catch (error) {
      // Fallback to console if remote logging fails (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send log to remote service:', error)
      }
    }
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.shouldLog(level)) return

    const entry = this.createLogEntry(level, message, context)
    
    this.addToBuffer(entry)
    this.logToConsole(entry)
    
    if (level >= LogLevel.ERROR) {
      this.logToRemote(entry)
    }
  }

  // Public logging methods
  debug(message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error | unknown, context: LogContext = {}): void {
    const errorContext = { ...context }
    
    if (error instanceof Error) {
      errorContext.metadata = {
        ...errorContext.metadata,
        errorName: error.name,
        errorMessage: error.message
      }
      errorContext.stack = error.stack
    } else if (error) {
      errorContext.metadata = {
        ...errorContext.metadata,
        error: error
      }
    }

    this.log(LogLevel.ERROR, message, errorContext)
  }

  fatal(message: string, error?: Error | unknown, context: LogContext = {}): void {
    const errorContext = { ...context }
    
    if (error instanceof Error) {
      errorContext.metadata = {
        ...errorContext.metadata,
        errorName: error.name,
        errorMessage: error.message
      }
      errorContext.stack = error.stack
    }

    this.log(LogLevel.FATAL, message, errorContext)
  }

  // Utility methods
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  getLogLevel(): LogLevel {
    return this.logLevel
  }

  getRecentLogs(count: number = 20): LogEntry[] {
    return this.logBuffer.slice(-count)
  }

  clearBuffer(): void {
    this.logBuffer = []
  }

  // Performance logging helpers
  time(label: string, context: LogContext = {}): () => void {
    const start = performance.now()
    this.debug(`Timer started: ${label}`, context)
    
    return () => {
      const duration = performance.now() - start
      this.info(`Timer finished: ${label} (${duration.toFixed(2)}ms)`, {
        ...context,
        metadata: { ...context.metadata, duration }
      })
    }
  }

  // User action logging
  userAction(action: string, userId: string, metadata?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, {
      userId,
      action,
      metadata
    })
  }

  // API call logging
  apiCall(method: string, endpoint: string, status?: number, duration?: number, context: LogContext = {}): void {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    const message = `API ${method} ${endpoint} ${status ? `- ${status}` : ''}`
    
    this.log(level, message, {
      ...context,
      component: 'API',
      metadata: {
        ...context.metadata,
        method,
        endpoint,
        status,
        duration
      }
    })
  }
}

// Export singleton instance and helper functions
export const logger = Logger.getInstance()

// Convenience functions for common logging patterns
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => {
  logger.error(message, error, context)
}

export const logInfo = (message: string, context?: LogContext) => {
  logger.info(message, context)
}

export const logWarning = (message: string, context?: LogContext) => {
  logger.warn(message, context)
}

export const logDebug = (message: string, context?: LogContext) => {
  logger.debug(message, context)
}

// Component-specific logger factory
export const createComponentLogger = (componentName: string) => {
  return {
    debug: (message: string, context: LogContext = {}) =>
      logger.debug(message, { ...context, component: componentName }),
    info: (message: string, context: LogContext = {}) =>
      logger.info(message, { ...context, component: componentName }),
    warn: (message: string, context: LogContext = {}) =>
      logger.warn(message, { ...context, component: componentName }),
    error: (message: string, error?: Error | unknown, context: LogContext = {}) =>
      logger.error(message, error, { ...context, component: componentName }),
    userAction: (action: string, userId: string, metadata?: Record<string, unknown>) =>
      logger.userAction(action, userId, metadata),
    time: (label: string, context: LogContext = {}) =>
      logger.time(label, { ...context, component: componentName })
  }
}

export default logger