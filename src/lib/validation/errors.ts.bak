import { sanitizeErrorMessage } from './sanitization'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('ValidationErrors')

export class ValidationError extends Error {
  public readonly code: string
  public readonly field?: string
  public readonly statusCode: number

  constructor(
    message: string,
    options: {
      code?: string
      field?: string
      statusCode?: number
      cause?: Error
    } = {}
  ) {
    const {
      code = 'VALIDATION_ERROR',
      field,
      statusCode = 400,
      cause,
    } = options

    super(sanitizeErrorMessage(message))
    
    this.name = 'ValidationError'
    this.code = code
    this.field = field
    this.statusCode = statusCode
    
    if (cause) {
      this.cause = cause
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }
}

export class SecurityError extends ValidationError {
  constructor(message: string, field?: string) {
    super(message, {
      code: 'SECURITY_ERROR',
      field,
      statusCode: 403,
    })
    this.name = 'SecurityError'
  }
}

export class RateLimitError extends ValidationError {
  public readonly retryAfter: number

  constructor(message: string, retryAfter: number = 60) {
    super(message, {
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
    })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Formats validation errors for user display
 */
export function formatValidationErrors(errors: string[]): Record<string, string> {
  const formatted: Record<string, string> = {}

  errors.forEach(error => {
    // Parse error format: "field.path: error message"
    const colonIndex = error.indexOf(':')
    if (colonIndex > 0) {
      const fieldPath = error.substring(0, colonIndex).trim()
      const errorMessage = sanitizeErrorMessage(error.substring(colonIndex + 1).trim())
      
      // Handle nested field paths (e.g., "settings.theme" -> "settings")
      const topLevelField = fieldPath.split('.')[0]
      formatted[topLevelField] = errorMessage
    } else {
      // General error without specific field
      formatted._general = sanitizeErrorMessage(error)
    }
  })

  return formatted
}

/**
 * Creates user-friendly error messages
 */
export function createUserFriendlyMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }

  if (error instanceof Error) {
    // Map common error patterns to user-friendly messages
    const message = error.message.toLowerCase()

    if (message.includes('unique') || message.includes('duplicate')) {
      return 'This value is already in use. Please choose a different one.'
    }

    if (message.includes('required') || message.includes('not null')) {
      return 'This field is required.'
    }

    if (message.includes('invalid email') || message.includes('email')) {
      return 'Please enter a valid email address.'
    }

    if (message.includes('password')) {
      return 'Password requirements not met. Please check the requirements.'
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action.'
    }

    if (message.includes('not found')) {
      return 'The requested item could not be found.'
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }

    // Return sanitized original message as fallback
    return sanitizeErrorMessage(error.message)
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Error boundary helper for validation errors
 */
export function handleValidationError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof ValidationError) {
    logger.warn('Validation error occurred', {
      code: error.code,
      field: error.field,
      message: error.message,
      ...context,
    })
    return {
      type: 'validation',
      message: error.message,
      code: error.code,
      field: error.field,
      statusCode: error.statusCode,
    }
  }

  if (error instanceof SecurityError) {
    logger.error('Security error occurred', error, context)
    return {
      type: 'security',
      message: 'Security validation failed',
      code: 'SECURITY_ERROR',
      statusCode: 403,
    }
  }

  if (error instanceof RateLimitError) {
    logger.warn('Rate limit exceeded', {
      message: error.message,
      retryAfter: error.retryAfter,
      ...context,
    })
    return {
      type: 'rateLimit',
      message: error.message,
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      retryAfter: error.retryAfter,
    }
  }

  // Handle unknown errors
  logger.error('Unknown validation error', error, context)
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  }
}

/**
 * Validation error aggregation for forms
 */
export class ValidationErrorCollector {
  private errors: Map<string, string[]> = new Map()

  addError(field: string, message: string): void {
    const existing = this.errors.get(field) || []
    existing.push(sanitizeErrorMessage(message))
    this.errors.set(field, existing)
  }

  addFieldErrors(field: string, messages: string[]): void {
    const sanitized = messages.map(sanitizeErrorMessage)
    this.errors.set(field, sanitized)
  }

  hasErrors(): boolean {
    return this.errors.size > 0
  }

  getErrors(): Record<string, string[]> {
    return Object.fromEntries(this.errors.entries())
  }

  getFirstErrors(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [field, messages] of this.errors.entries()) {
      if (messages.length > 0) {
        result[field] = messages[0]
      }
    }
    return result
  }

  getAllErrorMessages(): string[] {
    const messages: string[] = []
    for (const fieldMessages of this.errors.values()) {
      messages.push(...fieldMessages)
    }
    return messages
  }

  clear(): void {
    this.errors.clear()
  }

  clearField(field: string): void {
    this.errors.delete(field)
  }

  isEmpty(): boolean {
    return this.errors.size === 0
  }
}

/**
 * Retry helper for transient validation errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    backoffMs?: number
    retryCondition?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    retryCondition = (error) => {
      // Default: retry on network errors, not on validation errors
      return error instanceof Error && 
             (error.message.includes('network') || error.message.includes('timeout'))
    },
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !retryCondition(error)) {
        throw error
      }

      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1))
      )

      logger.info('Retrying operation after error', {
        attempt,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  throw lastError
}