import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateData } from './schemas'
import { sanitizeObject, sanitizeErrorMessage } from './sanitization'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('ValidationMiddleware')

export interface ValidationOptions {
  sanitize?: boolean
  logErrors?: boolean
  returnValidationErrors?: boolean
}

/**
 * Creates a validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
) {
  const {
    sanitize = true,
    logErrors = true,
    returnValidationErrors = true,
  } = options

  return function validationMiddleware(
    handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest): Promise<NextResponse> {
      try {
        // Parse request body
        let requestData: unknown
        try {
          requestData = await req.json()
        } catch (error) {
          if (logErrors) {
            logger.warn('Invalid JSON in request body', { error: error.message })
          }
          
          if (returnValidationErrors) {
            return NextResponse.json(
              { 
                error: 'Invalid JSON in request body',
                code: 'INVALID_JSON'
              },
              { status: 400 }
            )
          }
          
          return NextResponse.json(
            { error: 'Bad request' },
            { status: 400 }
          )
        }

        // Sanitize data if requested
        if (sanitize && requestData && typeof requestData === 'object') {
          requestData = sanitizeObject(requestData as Record<string, unknown>)
        }

        // Validate data
        const validationResult = validateData(schema, requestData)

        if (!validationResult.success) {
          if (logErrors) {
            logger.warn('Request validation failed', {
              errors: validationResult.errors,
              data: requestData,
              url: req.url,
              method: req.method,
            })
          }

          if (returnValidationErrors) {
            return NextResponse.json(
              {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: validationResult.errors?.map(sanitizeErrorMessage),
              },
              { status: 400 }
            )
          }

          return NextResponse.json(
            { error: 'Bad request' },
            { status: 400 }
          )
        }

        // Call the actual handler with validated data
        return await handler(req, validationResult.data!)

      } catch (error) {
        if (logErrors) {
          logger.error('Validation middleware error', error, {
            url: req.url,
            method: req.method,
          })
        }

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Validates query parameters
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams,
  options: ValidationOptions = {}
): { success: boolean; data?: T; errors?: string[] } {
  const {
    sanitize = true,
    logErrors = true,
  } = options

  try {
    // Convert URLSearchParams to object
    const queryObject: Record<string, unknown> = {}
    
    for (const [key, value] of searchParams.entries()) {
      // Handle multiple values for the same key
      if (queryObject[key]) {
        const existing = queryObject[key]
        if (Array.isArray(existing)) {
          existing.push(value)
        } else {
          queryObject[key] = [existing, value]
        }
      } else {
        queryObject[key] = value
      }
    }

    // Sanitize if requested
    const dataToValidate = sanitize ? sanitizeObject(queryObject) : queryObject

    // Validate
    const result = validateData(schema, dataToValidate)

    if (!result.success && logErrors) {
      logger.warn('Query parameter validation failed', {
        errors: result.errors,
        params: Object.fromEntries(searchParams.entries()),
      })
    }

    return result

  } catch (error) {
    if (logErrors) {
      logger.error('Query parameter validation error', error)
    }

    return {
      success: false,
      errors: ['Query parameter validation failed'],
    }
  }
}

/**
 * Rate limiting validation
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitOptions {
  maxRequests: number
  windowMs: number
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const {
    maxRequests,
    windowMs,
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options

  return function rateLimitMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest): Promise<NextResponse> {
      const key = keyGenerator(req)
      const now = Date.now()
      
      // Clean up expired entries
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime <= now) {
          rateLimitStore.delete(k)
        }
      }

      // Get or create rate limit data
      let limitData = rateLimitStore.get(key)
      if (!limitData || limitData.resetTime <= now) {
        limitData = { count: 0, resetTime: now + windowMs }
        rateLimitStore.set(key, limitData)
      }

      // Check if limit exceeded
      if (limitData.count >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          count: limitData.count,
          maxRequests,
          resetTime: limitData.resetTime,
        })

        return NextResponse.json(
          {
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((limitData.resetTime - now) / 1000),
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': Math.max(0, maxRequests - limitData.count).toString(),
              'X-RateLimit-Reset': Math.ceil(limitData.resetTime / 1000).toString(),
              'Retry-After': Math.ceil((limitData.resetTime - now) / 1000).toString(),
            }
          }
        )
      }

      // Execute handler
      const response = await handler(req)

      // Update count based on response (if not skipping)
      const shouldCount = !(
        (skipSuccessfulRequests && response.status < 400) ||
        (skipFailedRequests && response.status >= 400)
      )

      if (shouldCount) {
        limitData.count++
        rateLimitStore.set(key, limitData)
      }

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - limitData.count).toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(limitData.resetTime / 1000).toString())

      return response
    }
  }
}

/**
 * CORS validation middleware
 */
export function createCorsMiddleware(options: {
  origin?: string | string[] | ((origin: string) => boolean)
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
} = {}) {
  const {
    origin = process.env.NODE_ENV === 'production' ? false : '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true,
  } = options

  return function corsMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest): Promise<NextResponse> {
      const requestOrigin = req.headers.get('origin')
      let allowedOrigin = ''

      // Determine allowed origin
      if (origin === '*') {
        allowedOrigin = '*'
      } else if (typeof origin === 'string') {
        allowedOrigin = origin
      } else if (Array.isArray(origin)) {
        allowedOrigin = origin.includes(requestOrigin || '') ? (requestOrigin || '') : ''
      } else if (typeof origin === 'function') {
        allowedOrigin = origin(requestOrigin || '') ? (requestOrigin || '') : ''
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 })
        
        if (allowedOrigin) {
          response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
        }
        
        response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
        response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
        
        if (credentials && allowedOrigin !== '*') {
          response.headers.set('Access-Control-Allow-Credentials', 'true')
        }

        return response
      }

      // Execute handler
      const response = await handler(req)

      // Add CORS headers to response
      if (allowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      }

      if (credentials && allowedOrigin !== '*') {
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      }

      return response
    }
  }
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware<T>(...middlewares: Array<(handler: T) => T>): (handler: T) => T {
  return middlewares.reduce((composed, middleware) => (handler) => middleware(composed(handler)))
}