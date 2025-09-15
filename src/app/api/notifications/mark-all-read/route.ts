import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('NotificationMarkAllReadAPI')

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export async function POST() {
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

    logger.info('Marking all notifications as read', {
      metadata: { userId: user.id }
    })

    // Mark all unread notifications as read
    const { error: updateError, count } = await supabase
      .from('inapp_notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (updateError) {
      logger.error('Failed to mark all notifications as read', updateError, {
        metadata: { userId: user.id }
      })
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      )
    }

    logger.info('All notifications marked as read successfully', {
      metadata: { 
        userId: user.id,
        markedCount: count || 0
      }
    })

    return NextResponse.json({
      success: true,
      data: { marked_count: count || 0 },
      message: 'All notifications marked as read'
    })

  } catch (error) {
    logger.error('Unexpected error marking all notifications as read', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}