import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createValidationMiddleware, createRateLimitMiddleware } from '@/lib/validation/middleware'
import { createComponentLogger } from '@/lib/logger'
// Removed unused imports: InAppNotification, CreateNotificationRequest

const logger = createComponentLogger('NotificationsAPI')

// Rate limiting: 30 requests per minute per user for notifications
const rateLimitMiddleware = createRateLimitMiddleware({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id')
    return userId || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
  },
})

// Schema for creating notifications
const createNotificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  notification_type: z.string().min(1, 'Notification type is required'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  message: z.string().min(1, 'Message is required'),
  context_type: z.string().optional(),
  context_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  scheduled_for: z.string().datetime().optional(),
})

const validationMiddleware = createValidationMiddleware(createNotificationSchema, {
  sanitize: true,
  logErrors: true,
  returnValidationErrors: process.env.NODE_ENV === 'development',
})

/**
 * GET /api/notifications
 * Get current user's in-app notifications
 */
export async function GET(req: NextRequest) {
  return rateLimitMiddleware(async () => {
    try {
      const supabase = await createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { searchParams } = new URL(req.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
      const offset = parseInt(searchParams.get('offset') || '0')
      const unreadOnly = searchParams.get('unread_only') === 'true'

      logger.info('Fetching in-app notifications', {
        metadata: { 
          userId: user.id,
          limit,
          offset,
          unreadOnly
        }
      })

      let query = supabase
        .from('inapp_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      // Filter out expired notifications
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      const { data: notifications, error: notificationsError } = await query

      if (notificationsError) {
        logger.error('Failed to fetch notifications', notificationsError, {
          metadata: { userId: user.id }
        })
        return NextResponse.json(
          { error: 'Failed to fetch notifications' },
          { status: 500 }
        )
      }

      // Get unread count
      const { count: unreadCount, error: countError } = await supabase
        .from('inapp_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      if (countError) {
        logger.warn('Failed to get unread count', {
          metadata: { userId: user.id, error: countError }
        })
      }

      logger.info('In-app notifications fetched successfully', {
        metadata: { 
          userId: user.id,
          notificationCount: notifications?.length || 0,
          unreadCount: unreadCount || 0
        }
      })

      return NextResponse.json({
        success: true,
        data: notifications || [],
        pagination: {
          limit,
          offset,
          hasMore: (notifications?.length || 0) === limit
        },
        unread_count: unreadCount || 0
      })

    } catch (error) {
      logger.error('Unexpected error fetching notifications', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}

/**
 * POST /api/notifications
 * Create a new notification (internal/service use)
 */
export async function POST(req: NextRequest) {
  return rateLimitMiddleware(
    validationMiddleware(async (req: NextRequest, validatedData: z.infer<typeof createNotificationSchema>) => {
      try {
        // Check for service role or admin privileges
        const authHeader = req.headers.get('authorization')
        const isServiceRequest = authHeader?.includes('service_role') || 
                                authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '')

        if (!isServiceRequest) {
          // For regular users, verify they can only create notifications for themselves
          const supabase = await createClient()
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          
          if (userError || !user || user.id !== validatedData.user_id) {
            return NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            )
          }
        }

        const supabase = createServiceClient()

        logger.info('Creating notification', {
          metadata: { 
            targetUserId: validatedData.user_id,
            notificationType: validatedData.notification_type,
            isServiceRequest
          }
        })

        // Use the database function to queue the notification
        const { data: notificationId, error: queueError } = await supabase
          .rpc('queue_notification', {
            target_user_id: validatedData.user_id,
            notif_type: validatedData.notification_type,
            notif_title: validatedData.title,
            notif_message: validatedData.message,
            ctx_type: validatedData.context_type || null,
            ctx_id: validatedData.context_id || null,
            metadata_json: validatedData.metadata || {},
            schedule_for: validatedData.scheduled_for ? 
              new Date(validatedData.scheduled_for).toISOString() : 
              new Date().toISOString()
          })

        if (queueError) {
          logger.error('Failed to queue notification', queueError, {
            metadata: { 
              targetUserId: validatedData.user_id,
              notificationType: validatedData.notification_type
            }
          })
          return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
          )
        }

        logger.info('Notification queued successfully', {
          metadata: { 
            notificationId,
            targetUserId: validatedData.user_id,
            notificationType: validatedData.notification_type
          }
        })

        return NextResponse.json({
          success: true,
          data: { id: notificationId },
          message: 'Notification created successfully'
        })

      } catch (error) {
        logger.error('Unexpected error creating notification', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    })
  )(req)
}