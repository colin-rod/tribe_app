/**
 * Webhook-specific error types and handling
 */

export class WebhookError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'WEBHOOK_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'WebhookError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class AuthenticationError extends WebhookError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class ValidationError extends WebhookError {
  constructor(message: string = 'Invalid request data') {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class UserNotFoundError extends WebhookError {
  constructor(message: string = 'User not found') {
    super(message, 404, 'USER_NOT_FOUND')
  }
}

export class EmailProcessingError extends WebhookError {
  constructor(message: string = 'Email processing failed') {
    super(message, 500, 'EMAIL_PROCESSING_ERROR')
  }
}

export class PayloadTooLargeError extends WebhookError {
  constructor(message: string = 'Request payload too large') {
    super(message, 413, 'PAYLOAD_TOO_LARGE')
  }
}

export function createErrorResponse(error: WebhookError | Error) {
  if (error instanceof WebhookError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    }
  }

  // Handle unexpected errors
  return {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500
  }
}