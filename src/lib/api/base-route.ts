import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createRateLimitMiddleware } from '@/lib/validation/middleware'
import { createComponentLogger } from '@/lib/logger'

export interface APIRouteConfig {
  name: string
  rateLimitConfig?: {
    maxRequests: number
    windowMs: number
  }
  requireAuth?: boolean
  schema?: z.ZodSchema
}

export interface APIContext {
  req: NextRequest
  user?: any
  supabase: Awaited<ReturnType<typeof createClient>>
  validatedData?: any
}

export type APIHandler = (context: APIContext) => Promise<NextResponse>

export function createAPIRoute(config: APIRouteConfig) {
  const logger = createComponentLogger(`${config.name}API`)
  
  // Default rate limiting: 30 requests per minute
  const rateLimitMiddleware = createRateLimitMiddleware({
    maxRequests: config.rateLimitConfig?.maxRequests || 30,
    windowMs: config.rateLimitConfig?.windowMs || 60 * 1000,
    keyGenerator: (req) => {
      const userId = req.headers.get('x-user-id')
      return userId || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    },
  })

  const withMiddleware = (handler: APIHandler) => {
    return rateLimitMiddleware(async (req: NextRequest) => {
      try {
        const supabase = await createClient()
        let user = null
        let validatedData = null

        // Authentication check
        if (config.requireAuth !== false) {
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
          
          if (userError || !authUser) {
            logger.warn('Unauthorized API access attempt', {
              metadata: { 
                path: req.url,
                userError: userError?.message 
              }
            })
            return NextResponse.json(
              { error: 'Unauthorized' },
              { status: 401 }
            )
          }
          user = authUser
        }

        // Request validation
        if (config.schema && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
          let requestData: unknown
          try {
            requestData = await req.json()
          } catch {
            return NextResponse.json(
              { error: 'Invalid JSON' },
              { status: 400 }
            )
          }

          const validationResult = config.schema.safeParse(requestData)
          if (!validationResult.success) {
            logger.warn('Request validation failed', {
              metadata: { 
                errors: validationResult.error.issues,
                userId: user?.id 
              }
            })
            return NextResponse.json(
              {
                error: 'Validation failed',
                details: validationResult.error.issues.map(err => 
                  `${err.path.join('.')}: ${err.message}`
                ),
              },
              { status: 400 }
            )
          }
          validatedData = validationResult.data
        }

        // Create context and call handler
        const context: APIContext = {
          req,
          user,
          supabase,
          validatedData
        }

        return await handler(context)

      } catch (error) {
        logger.error('Unexpected API error', error, {
          metadata: { 
            path: req.url,
            method: req.method 
          }
        })
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    })
  }

  const createHandler = (method: string, handler: APIHandler) => {
    return withMiddleware(async (context) => {
      if (context.req.method !== method) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        )
      }
      return handler(context)
    })
  }

  // Standard success response helper
  const successResponse = (data: any, message?: string, status: number = 200) => {
    return NextResponse.json(
      {
        success: true,
        data,
        ...(message && { message })
      },
      { status }
    )
  }

  // Standard error response helper
  const errorResponse = (error: string, status: number = 400, details?: any) => {
    return NextResponse.json(
      {
        error,
        ...(details && { details })
      },
      { status }
    )
  }

  // Database error handler
  const handleDatabaseError = (error: any, operation: string, logger: any) => {
    logger.error(`Database ${operation} failed`, error)
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return errorResponse('Resource already exists', 409)
    }
    if (error.code === '23503') { // Foreign key constraint violation
      return errorResponse('Referenced resource not found', 400)
    }
    if (error.code === '42501') { // Insufficient privilege
      return errorResponse('Insufficient permissions', 403)
    }
    
    return errorResponse('Database operation failed', 500)
  }

  return {
    GET: (handler: APIHandler) => createHandler('GET', handler),
    POST: (handler: APIHandler) => createHandler('POST', handler),
    PUT: (handler: APIHandler) => createHandler('PUT', handler),
    DELETE: (handler: APIHandler) => createHandler('DELETE', handler),
    PATCH: (handler: APIHandler) => createHandler('PATCH', handler),
    successResponse,
    errorResponse,
    handleDatabaseError,
    logger
  }
}

// Pagination helper
export function createPaginationParams(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const page = Math.floor(offset / limit) + 1

  return {
    limit,
    offset,
    page,
    range: [offset, offset + limit - 1] as [number, number]
  }
}

// Common response formatters
export function formatPaginatedResponse(data: any[], pagination: ReturnType<typeof createPaginationParams>, total?: number) {
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      count: data.length,
      hasMore: data.length === pagination.limit,
      ...(total !== undefined && { total })
    }
  }
}

// Query parameter helpers
export function parseQueryFilters(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filters: Record<string, string | boolean | number> = {}

  for (const [key, value] of searchParams.entries()) {
    if (key === 'limit' || key === 'offset') continue // Skip pagination params
    
    // Convert boolean strings
    if (value === 'true') filters[key] = true
    else if (value === 'false') filters[key] = false
    // Convert numeric strings
    else if (/^\d+$/.test(value)) filters[key] = parseInt(value)
    // Keep as string
    else filters[key] = value
  }

  return filters
}