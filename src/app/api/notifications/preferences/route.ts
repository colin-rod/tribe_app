import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createValidationMiddleware, createRateLimitMiddleware } from '@/lib/validation/middleware'
import { createComponentLogger } from '@/lib/logger'
// Removed unused import: UserNotificationPreferences

const logger = createComponentLogger('NotificationPreferencesAPI')

// Rate limiting: 20 requests per minute per user for notification preferences
const rateLimitMiddleware = createRateLimitMiddleware({
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id')
    return userId || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
  },
})

// Schema for updating notification preferences
const updatePreferencesSchema = z.object({
  // Memory-related notifications
  email_new_memories: z.boolean().optional(),
  email_memory_assignments: z.boolean().optional(),
  email_memory_processing: z.boolean().optional(),
  
  // Email-to-memory notifications
  email_processing_success: z.boolean().optional(),
  email_processing_failed: z.boolean().optional(),
  
  // Branch and tree notifications
  email_branch_invitations: z.boolean().optional(),
  email_tree_invitations: z.boolean().optional(),
  email_branch_activity: z.boolean().optional(),
  
  // System notifications
  email_system_updates: z.boolean().optional(),
  
  // Digest options
  email_daily_digest: z.boolean().optional(),
  email_weekly_digest: z.boolean().optional(),
  
  // In-app notifications
  inapp_new_memories: z.boolean().optional(),
  inapp_memory_assignments: z.boolean().optional(),
  inapp_branch_invitations: z.boolean().optional(),
  inapp_tree_invitations: z.boolean().optional(),
  inapp_system_updates: z.boolean().optional(),
  
  // Notification frequency and timing
  digest_frequency: z.enum(['daily', 'weekly', 'never']).optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
})

const validationMiddleware = createValidationMiddleware(updatePreferencesSchema, {
  sanitize: true,
  logErrors: true,
  returnValidationErrors: process.env.NODE_ENV === 'development',
})

/**
 * GET /api/notifications/preferences
 * Get current user's notification preferences
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

      logger.info('Fetching notification preferences', { metadata: { userId: user.id } })

      // Get or create user notification preferences using the database function
      const { data: preferences, error: preferencesError } = await supabase
        .rpc('get_user_notification_preferences', { user_uuid: user.id })

      if (preferencesError) {
        logger.error('Failed to fetch notification preferences', preferencesError, {
          metadata: { userId: user.id }
        })
        return NextResponse.json(
          { error: 'Failed to fetch notification preferences' },
          { status: 500 }
        )
      }

      logger.info('Notification preferences fetched successfully', {
        metadata: { userId: user.id, hasPreferences: !!preferences }
      })

      return NextResponse.json({
        success: true,
        data: preferences
      })

    } catch (error) {
      logger.error('Unexpected error fetching notification preferences', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}

/**
 * PUT /api/notifications/preferences
 * Update current user's notification preferences
 */
export async function PUT(req: NextRequest) {
  return rateLimitMiddleware(
    validationMiddleware(async (req: NextRequest, validatedData: z.infer<typeof updatePreferencesSchema>) => {
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

        logger.info('Updating notification preferences', {
          metadata: { 
            userId: user.id,
            updateFields: Object.keys(validatedData)
          }
        })

        // Prepare update data with timestamp
        const updateData = {
          ...validatedData,
          updated_at: new Date().toISOString()
        }

        // Update notification preferences (upsert behavior)
        const { data: updatedPreferences, error: updateError } = await supabase
          .from('user_notification_preferences')
          .upsert(
            {
              user_id: user.id,
              ...updateData
            },
            {
              onConflict: 'user_id',
              ignoreDuplicates: false
            }
          )
          .select()
          .single()

        if (updateError) {
          logger.error('Failed to update notification preferences', updateError, {
            metadata: { userId: user.id, updateData }
          })
          return NextResponse.json(
            { error: 'Failed to update notification preferences' },
            { status: 500 }
          )
        }

        logger.info('Notification preferences updated successfully', {
          metadata: { 
            userId: user.id,
            updatedFields: Object.keys(validatedData)
          }
        })

        return NextResponse.json({
          success: true,
          data: updatedPreferences,
          message: 'Notification preferences updated successfully'
        })

      } catch (error) {
        logger.error('Unexpected error updating notification preferences', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    })
  )(req)
}

/**
 * POST /api/notifications/preferences/reset
 * Reset user's notification preferences to defaults
 */
export async function POST(req: NextRequest) {
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

      logger.info('Resetting notification preferences to defaults', {
        metadata: { userId: user.id }
      })

      // Delete existing preferences to trigger default creation
      const { error: deleteError } = await supabase
        .from('user_notification_preferences')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        logger.error('Failed to delete existing preferences', deleteError, {
          metadata: { userId: user.id }
        })
        return NextResponse.json(
          { error: 'Failed to reset notification preferences' },
          { status: 500 }
        )
      }

      // Get new default preferences
      const { data: defaultPreferences, error: preferencesError } = await supabase
        .rpc('get_user_notification_preferences', { user_uuid: user.id })

      if (preferencesError) {
        logger.error('Failed to create default preferences', preferencesError, {
          metadata: { userId: user.id }
        })
        return NextResponse.json(
          { error: 'Failed to create default preferences' },
          { status: 500 }
        )
      }

      logger.info('Notification preferences reset to defaults successfully', {
        metadata: { userId: user.id }
      })

      return NextResponse.json({
        success: true,
        data: defaultPreferences,
        message: 'Notification preferences reset to defaults'
      })

    } catch (error) {
      logger.error('Unexpected error resetting notification preferences', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}