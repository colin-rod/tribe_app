
import { createComponentLogger } from '@/lib/logger'

const errorLogger = createComponentLogger('ErrorHandler')

export class AppError extends Error {
  public readonly code: string
  public readonly context: Record<string, unknown>
  public readonly timestamp: Date
  public readonly isOperational: boolean

  constructor(
    message: string, 
    code = 'UNKNOWN_ERROR', 
    context: Record<string, unknown> = {},
    isOperational = true
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.context = context
    this.timestamp = new Date()
    this.isOperational = isOperational

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

export enum ErrorCodes {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Data & Database
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // File Operations
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // Network & External Services
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  // Voice & AI
  SPEECH_RECOGNITION_ERROR = 'SPEECH_RECOGNITION_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  
  // General
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

interface ErrorHandlerOptions {
  logError?: boolean
  showToUser?: boolean
  showToast?: boolean
  fallbackMessage?: string
}

class ErrorHandler {
  private static instance: ErrorHandler
  private errorCallbacks: Set<(error: AppError) => void> = new Set()

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  public addErrorCallback(callback: (error: AppError) => void): void {
    this.errorCallbacks.add(callback)
  }

  public removeErrorCallback(callback: (error: AppError) => void): void {
    this.errorCallbacks.delete(callback)
  }

  public handle(
    error: unknown, 
    options: ErrorHandlerOptions = {}
  ): AppError {
    const {
      logError = true,
      showToast = false,
      fallbackMessage = 'An unexpected error occurred'
    } = options

    let appError: AppError

    if (error instanceof AppError) {
      appError = error
    } else if (error instanceof Error) {
      appError = new AppError(
        error.message || fallbackMessage,
        this.getErrorCode(error),
        { originalError: error.name }
      )
    } else {
      appError = new AppError(
        fallbackMessage,
        ErrorCodes.UNKNOWN_ERROR,
        { originalError: error }
      )
    }

    if (logError) {
      this.logError(appError)
    }

    // Notify callbacks (e.g., toast notifications, error reporting)
    this.errorCallbacks.forEach(callback => {
      try {
        callback(appError)
      } catch (callbackError) {
        errorLogger.error('Error callback failed', callbackError, { action: 'errorCallbackExecution' })
      }
    })

    // Auto-show toast if requested
    if (showToast && typeof window !== 'undefined') {
      // Dynamically import toast service to avoid SSR issues
      import('./toast-service').then(({ handleErrorToast }) => {
        handleErrorToast(appError)
      }).catch(() => {
        // Fallback to console error if toast service fails
        errorLogger.error('Failed to show error toast', null, { 
          action: 'showErrorToast', 
          metadata: { message: appError.message }
        })
      })
    }

    return appError
  }

  private getErrorCode(error: Error): string {
    // Map common error patterns to error codes
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCodes.NETWORK_ERROR
    }
    if (message.includes('unauthorized') || message.includes('auth')) {
      return ErrorCodes.UNAUTHORIZED
    }
    if (message.includes('not found') || message.includes('404')) {
      return ErrorCodes.NOT_FOUND
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCodes.VALIDATION_ERROR
    }
    if (message.includes('database') || message.includes('sql')) {
      return ErrorCodes.DATABASE_ERROR
    }
    
    return ErrorCodes.UNKNOWN_ERROR
  }

  private logError(error: AppError): void {
    const errorInfo = {
      message: error.message,
      code: error.code,
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    }

    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
      errorLogger.error('Application Error Details', null, {
        action: 'logError',
        metadata: errorInfo
      })
    }

    // In production, you might want to send to an error reporting service
    // like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureError(error)
    }
  }

  public createError(
    message: string,
    code: ErrorCodes,
    context?: Record<string, unknown>
  ): AppError {
    return new AppError(message, code, context)
  }
}

// Helper functions for common error handling patterns
export const errorHandler = ErrorHandler.getInstance()

export function handleAsyncError<T>(
  asyncFn: () => Promise<T>,
  options?: ErrorHandlerOptions
): Promise<T | null> {
  return asyncFn().catch(error => {
    errorHandler.handle(error, options)
    return null
  })
}

export function handleError(
  error: unknown,
  options?: ErrorHandlerOptions
): AppError {
  return errorHandler.handle(error, options)
}

export function createError(
  message: string,
  code: ErrorCodes = ErrorCodes.UNKNOWN_ERROR,
  context?: Record<string, unknown>
): AppError {
  return errorHandler.createError(message, code, context)
}

// User-friendly error messages
export const getUserFriendlyMessage = (error: AppError): string => {
  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      return 'Connection problem. Please check your internet and try again.'
    case ErrorCodes.FILE_TOO_LARGE:
      return 'File is too large. Please choose a smaller file.'
    case ErrorCodes.INVALID_FILE_TYPE:
      return 'File type not supported. Please choose a different file.'
    case ErrorCodes.UNAUTHORIZED:
      return 'Please sign in to continue.'
    case ErrorCodes.FORBIDDEN:
      return 'You don\'t have permission to do that.'
    case ErrorCodes.NOT_FOUND:
      return 'The requested item could not be found.'
    case ErrorCodes.SPEECH_RECOGNITION_ERROR:
      return 'Voice recognition failed. Please try again.'
    case ErrorCodes.AI_SERVICE_ERROR:
      return 'AI service is temporarily unavailable.'
    default:
      return error.message || 'Something went wrong. Please try again.'
  }
}