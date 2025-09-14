/**
 * API Error Handling Middleware
 * Provides consistent error handling across all API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { AppError, ErrorCodes, errorHandler } from '@/lib/error-handler'
import { getContextualErrorMessage } from '@/lib/error-messages'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('ApiErrorMiddleware')

interface ApiErrorResponse {
  error: {
    message: string
    code: string
    details?: any
    timestamp: string
    requestId: string
  }
  success: false
}

interface ApiSuccessResponse<T = any> {
  data: T
  success: true
  timestamp: string
  requestId: string
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Wraps API route handlers with comprehensive error handling
 */
export function withErrorHandling<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<T>,
  options: {
    context?: {
      action?: string
      resourceType?: string
      feature?: string
    }
    validateAuth?: boolean
    rateLimit?: {
      maxRequests: number
      windowMs: number
    }
  } = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      // Add request ID to headers for tracing
      const requestUrl = req.url
      const method = req.method

      logger.info(`API request started`, {
        metadata: {
          method,
          url: requestUrl,
          requestId,
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        }
      })

      // Optional auth validation
      if (options.validateAuth) {
        const authResult = await validateAuthentication(req)
        if (!authResult.valid) {
          throw new AppError(
            'Authentication required',
            ErrorCodes.UNAUTHORIZED,
            { reason: authResult.reason }
          )
        }
      }

      // Optional rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await checkRateLimit(req, options.rateLimit)
        if (!rateLimitResult.allowed) {
          throw new AppError(
            'Too many requests. Please try again later.',
            ErrorCodes.API_RATE_LIMIT,
            { 
              limit: options.rateLimit.maxRequests,
              window: options.rateLimit.windowMs,
              retryAfter: rateLimitResult.retryAfter
            }
          )
        }
      }

      // Execute the main handler
      const result = await handler(req, context)
      const duration = Date.now() - startTime

      logger.info(`API request completed`, {
        metadata: {
          method,
          url: requestUrl,
          requestId,
          duration,
          status: 200
        }
      })

      // Return success response
      const response: ApiSuccessResponse<T> = {
        data: result,
        success: true,
        timestamp: new Date().toISOString(),
        requestId
      }

      return NextResponse.json(response, { status: 200 })

    } catch (error) {
      const duration = Date.now() - startTime
      
      // Convert to AppError
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            ErrorCodes.INTERNAL_SERVER_ERROR,
            { originalError: error }
          )

      // Log the error
      logger.error(`API request failed`, appError, {
        metadata: {
          method: req.method,
          url: req.url,
          requestId,
          duration,
          statusCode: getStatusCodeFromError(appError)
        }
      })

      // Get user-friendly error message
      const userMessage = getContextualErrorMessage(appError, options.context)

      // Create error response
      const errorResponse: ApiErrorResponse = {
        error: {
          message: userMessage,
          code: appError.code,
          details: process.env.NODE_ENV === 'development' ? {
            originalMessage: appError.message,
            context: appError.context,
            stack: appError.stack
          } : undefined,
          timestamp: new Date().toISOString(),
          requestId
        },
        success: false
      }

      const statusCode = getStatusCodeFromError(appError)
      const response = NextResponse.json(errorResponse, { status: statusCode })

      // Add rate limit headers if applicable
      if (appError.code === ErrorCodes.API_RATE_LIMIT && appError.context.retryAfter) {
        response.headers.set('Retry-After', String(appError.context.retryAfter))
        response.headers.set('X-RateLimit-Limit', String(options.rateLimit?.maxRequests || 100))
        response.headers.set('X-RateLimit-Remaining', '0')
      }

      return response
    }
  }
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate authentication from request
 */
async function validateAuthentication(req: NextRequest): Promise<{
  valid: boolean
  reason?: string
  userId?: string
}> {
  try {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return { valid: false, reason: 'No authorization header' }
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, reason: 'Invalid authorization format' }
    }

    const token = authHeader.substring(7)
    
    // Here you would validate the token with your auth provider
    // For Supabase, you might use something like:
    // const { data: { user }, error } = await supabase.auth.getUser(token)
    
    // Placeholder validation
    if (!token || token.length < 10) {
      return { valid: false, reason: 'Invalid token' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, reason: 'Authentication validation failed' }
  }
}

/**
 * Check rate limiting
 */
async function checkRateLimit(
  req: NextRequest, 
  config: { maxRequests: number; windowMs: number }
): Promise<{
  allowed: boolean
  retryAfter?: number
}> {
  // Get client identifier (IP address or user ID)
  const clientId = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown'

  // In a real implementation, you would use Redis or a similar store
  // For now, this is a placeholder
  const key = `rate_limit:${clientId}`
  
  // This would typically query your rate limiting store
  // and return whether the request is allowed
  
  return { allowed: true } // Placeholder
}

/**
 * Map AppError to HTTP status codes
 */
function getStatusCodeFromError(error: AppError): number {
  switch (error.code) {
    case ErrorCodes.VALIDATION_ERROR:
      return 400
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.TOKEN_EXPIRED:
      return 401
    case ErrorCodes.FORBIDDEN:
      return 403
    case ErrorCodes.NOT_FOUND:
      return 404
    case ErrorCodes.DUPLICATE_ENTRY:
      return 409
    case ErrorCodes.API_RATE_LIMIT:
      return 429
    case ErrorCodes.INTERNAL_SERVER_ERROR:
    case ErrorCodes.DATABASE_ERROR:
      return 500
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return 503
    default:
      return 500
  }
}

/**
 * Helper to create standardized success responses
 */
export function createSuccessResponse<T>(
  data: T,
  options: {
    requestId?: string
    message?: string
  } = {}
): ApiSuccessResponse<T> {
  return {
    data,
    success: true,
    timestamp: new Date().toISOString(),
    requestId: options.requestId || generateRequestId()
  }
}

/**
 * Helper to create standardized error responses
 */
export function createErrorResponse(
  error: AppError,
  options: {
    requestId?: string
    context?: {
      action?: string
      resourceType?: string
      feature?: string
    }
  } = {}
): ApiErrorResponse {
  const userMessage = getContextualErrorMessage(error, options.context)

  return {
    error: {
      message: userMessage,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? {
        originalMessage: error.message,
        context: error.context,
        stack: error.stack
      } : undefined,
      timestamp: new Date().toISOString(),
      requestId: options.requestId || generateRequestId()
    },
    success: false
  }
}

/**
 * Middleware for handling async operations in API routes
 */
export async function handleAsyncApiOperation<T>(
  operation: () => Promise<T>,
  context: {
    action?: string
    resourceType?: string
    feature?: string
  } = {}
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Convert to AppError with context
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Operation failed',
          ErrorCodes.INTERNAL_SERVER_ERROR,
          { originalError: error, ...context }
        )

    // Log the error
    errorHandler.handle(appError, { logError: true })

    throw appError
  }
}