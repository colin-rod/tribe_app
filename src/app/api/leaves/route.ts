import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createValidationMiddleware, createRateLimitMiddleware } from '@/lib/validation/middleware'
import { createComponentLogger } from '@/lib/logger'
import { createUnassignedLeaf, getUserUnassignedLeaves } from '@/lib/leaf-assignments'

const logger = createComponentLogger('LeavesAPI')

// Rate limiting: 30 requests per minute per user for leaf operations
const rateLimitMiddleware = createRateLimitMiddleware({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id')
    return userId || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown' || 'anonymous'
  },
})

// Schema for creating unassigned leaves (for email ingestion)
const createUnassignedLeafSchema = z.object({
  author_id: z.string().uuid('Invalid user ID'),
  leaf_type: z.enum(['photo', 'video', 'audio', 'text', 'milestone']),
  content: z.string().optional(),
  media_urls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  milestone_type: z.string().optional(),
  milestone_date: z.string().datetime().optional(),
  season: z.string().optional(),
  ai_caption: z.string().optional(),
  ai_tags: z.array(z.string()).optional(),
})

const validationMiddleware = createValidationMiddleware(createUnassignedLeafSchema, {
  sanitize: true,
  logErrors: true,
  returnValidationErrors: process.env.NODE_ENV === 'development',
})

/**
 * POST /api/leaves
 * Create a new unassigned leaf (primarily for email ingestion)
 */
export async function POST(req: NextRequest) {
  return rateLimitMiddleware(
    validationMiddleware(async (req: NextRequest, validatedData: z.infer<typeof createUnassignedLeafSchema>) => {
      try {
        const supabase = await createClient()
        
        // Get current user if authenticated, otherwise use provided author_id (for webhook)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        // For webhook calls, we'll validate using API key in header
        const apiKey = req.headers.get('x-api-key')
        const isWebhookCall = !user && apiKey
        
        if (!user && !isWebhookCall) {
          logger.warn('Unauthorized leaf creation attempt', { metadata: { userError } })
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }

        // Validate API key for webhook calls
        if (isWebhookCall) {
          const expectedApiKey = process.env.WEBHOOK_API_KEY
          if (!expectedApiKey || apiKey !== expectedApiKey) {
            logger.warn('Invalid API key for webhook call', { metadata: { providedKey: apiKey?.substring(0, 8) + '...' } })
            return NextResponse.json(
              { error: 'Invalid API key' },
              { status: 401 }
            )
          }
          
          // Verify the author_id exists
          const { data: authorProfile, error: authorError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', validatedData.author_id)
            .single()
            
          if (authorError || !authorProfile) {
            logger.warn('Invalid author_id in webhook call', { metadata: { authorId: validatedData.author_id } })
            return NextResponse.json(
              { error: 'Invalid author ID' },
              { status: 400 }
            )
          }
        }

        // Use authenticated user's ID or webhook-provided author_id
        const authorId = user ? user.id : validatedData.author_id

        // Create the unassigned leaf
        const leaf = await createUnassignedLeaf({
          ...validatedData,
          author_id: authorId,
        })

        if (!leaf) {
          logger.error('Failed to create unassigned leaf', undefined, { 
            userId: authorId, 
            metadata: { data: validatedData }
          })
          return NextResponse.json(
            { error: 'Failed to create leaf' },
            { status: 500 }
          )
        }

        logger.info('Unassigned leaf created successfully', { 
          userId: authorId,
          metadata: {
            leafId: leaf.id, 
            leafType: leaf.leaf_type,
            isWebhook: isWebhookCall
          }
        })

        return NextResponse.json(
          { 
            success: true, 
            data: leaf,
            message: 'Leaf created successfully'
          },
          { status: 201 }
        )

      } catch (error) {
        logger.error('Unexpected error in leaf creation', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    })
  )(req)
}

/**
 * GET /api/leaves
 * Get user's unassigned leaves
 */
export async function GET(req: NextRequest) {
  return rateLimitMiddleware(async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Parse query parameters
      const { searchParams } = new URL(req.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
      const unassignedOnly = searchParams.get('unassigned') === 'true'

      let leaves
      
      if (unassignedOnly) {
        // Get only unassigned leaves
        leaves = await getUserUnassignedLeaves(user.id, limit, offset)
      } else {
        // Get all leaves (this would require a different function)
        const result = await supabase
          .from('posts')
          .select(`
            id,
            content,
            media_urls,
            leaf_type,
            milestone_type,
            tags,
            ai_caption,
            ai_tags,
            assignment_status,
            created_at,
            updated_at
          `)
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
          
        leaves = result.data || []
      }

      return NextResponse.json({
        success: true,
        data: leaves,
        pagination: {
          limit,
          offset,
          count: leaves.length,
        }
      })

    } catch (error) {
      logger.error('Unexpected error in leaves fetch', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}