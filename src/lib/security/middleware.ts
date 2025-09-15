/**
 * Security middleware helpers for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, getRateLimitHeaders, RATE_LIMIT_CONFIGS } from './rateLimiting'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('SecurityMiddleware')

export interface SecurityMiddlewareOptions {
  rateLimit?: keyof typeof RATE_LIMIT_CONFIGS | {
    windowMs: number
    maxRequests: number
    message?: string
  }
  requireAuth?: boolean
  allowedMethods?: string[]
  corsOrigins?: string[]
}

/**
 * Comprehensive security middleware for API routes
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  options: SecurityMiddlewareOptions = {}
) {
  return async function securityWrapper(req: NextRequest): Promise<NextResponse> {
    try {
      // Method validation
      if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405, headers: { Allow: options.allowedMethods.join(', ') } }
        )
      }

      // CORS handling
      if (options.corsOrigins) {
        const origin = req.headers.get('origin')
        const isAllowed = origin && options.corsOrigins.includes(origin)
        
        if (req.method === 'OPTIONS') {
          return new NextResponse(null, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
              'Access-Control-Allow-Methods': options.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Max-Age': '86400'
            }
          })
        }
        
        if (!isAllowed && origin) {
          return NextResponse.json(
            { error: 'CORS policy violation' },
            { status: 403 }
          )
        }
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await applyRateLimit(req, options.rateLimit)
        
        if (!rateLimitResult.allowed) {
          const headers = getRateLimitHeaders(rateLimitResult)
          const message = typeof options.rateLimit === 'object' 
            ? options.rateLimit.message || 'Rate limit exceeded'
            : RATE_LIMIT_CONFIGS[options.rateLimit].message
            
          return NextResponse.json(
            { error: message },
            { status: 429, headers }
          )
        }
      }

      // Execute the main handler
      const response = await handler(req)
      
      // Add security headers to response
      addSecurityHeaders(response)
      
      // Add rate limit headers if rate limiting was applied
      if (options.rateLimit) {
        const rateLimitResult = await applyRateLimit(req, options.rateLimit)
        const rateLimitHeaders = getRateLimitHeaders(rateLimitResult)
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      }
      
      return response
      
    } catch (error) {
      logger.error('Security middleware error', error, {
        metadata: {
          method: req.method,
          url: req.url,
          userAgent: req.headers.get('user-agent')
        }
      })
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Add security headers to API responses
 */
function addSecurityHeaders(response: NextResponse) {
  // Prevent caching of sensitive data
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  // Content security
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  
  // API-specific headers
  response.headers.set('X-API-Version', '1.0')
  response.headers.set('X-Response-Time', Date.now().toString())
}

/**
 * Authentication middleware helper
 */
export function withAuth(
  handler: (req: NextRequest, user: { id: string; email?: string }) => Promise<NextResponse> | NextResponse
) {
  return async function authWrapper(req: NextRequest): Promise<NextResponse> {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    try {
      // Here you would validate the token with Supabase
      // For now, this is a placeholder
      const token = authHeader.replace('Bearer ', '')
      
      // In a real implementation, you'd validate the JWT token
      // const { data: { user }, error } = await supabase.auth.getUser(token)
      // if (error || !user) throw new Error('Invalid token')
      
      const user = { id: 'placeholder' } // Placeholder
      
      return await handler(req, user)
      
    } catch (error) {
      logger.error('Authentication failed', error)
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }
}

/**
 * Request validation middleware
 */
export function withValidation<T>(
  schema: (data: unknown) => T,
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse> | NextResponse
) {
  return async function validationWrapper(req: NextRequest): Promise<NextResponse> {
    try {
      const data = await req.json()
      const validatedData = schema(data)
      return await handler(req, validatedData)
    } catch (error) {
      logger.error('Request validation failed', error)
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }
  }
}

/**
 * Compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: unknown) => unknown>) {
  return (handler: unknown) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

/**
 * Webhook security middleware
 */
export function withWebhookSecurity(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  options: {
    secretHeader?: string
    expectedSecret?: string
    hmacHeader?: string
    hmacSecret?: string
  } = {}
) {
  return async function webhookWrapper(req: NextRequest): Promise<NextResponse> {
    // Verify webhook secret
    if (options.secretHeader && options.expectedSecret) {
      const providedSecret = req.headers.get(options.secretHeader)
      if (providedSecret !== options.expectedSecret) {
        logger.warn('Webhook authentication failed - invalid secret', {
          metadata: {
            providedSecret: providedSecret ? '[REDACTED]' : 'null',
            expectedHeader: options.secretHeader
          }
        })
        return NextResponse.json(
          { error: 'Unauthorized webhook' },
          { status: 401 }
        )
      }
    }

    // Verify HMAC signature
    if (options.hmacHeader && options.hmacSecret) {
      const signature = req.headers.get(options.hmacHeader)
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing webhook signature' },
          { status: 401 }
        )
      }

      const body = await req.text()
      const isValid = await verifyWebhookSignature(body, signature, options.hmacSecret)
      
      if (!isValid) {
        logger.warn('Webhook authentication failed - invalid signature')
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }

      // Create a new request with the body for the handler
      const newRequest = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: body
      })
      
      return await handler(newRequest)
    }

    return await handler(req)
  }
}

/**
 * Verify webhook HMAC signature
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const crypto = await import('crypto')
    
    // Remove signature prefix if present (e.g., "sha256=")
    const cleanSignature = signature.replace(/^sha256=/, '')
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    logger.error('HMAC verification failed', error)
    return false
  }
}