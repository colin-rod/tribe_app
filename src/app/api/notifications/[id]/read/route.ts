import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('NotificationReadAPI')

/**
 * PUT /api/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    logger.info('Marking notification as read', {
      metadata: { 
        userId: user.id,
        notificationId
      }
    })

    // Use the database function to mark notification as read
    const { data: success, error: readError } = await supabase
      .rpc('mark_notification_read', { notification_id: notificationId })

    if (readError) {
      logger.error('Failed to mark notification as read', readError, {
        metadata: { 
          userId: user.id,
          notificationId
        }
      })
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      )
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Notification not found or not owned by user' },
        { status: 404 }
      )
    }

    logger.info('Notification marked as read successfully', {
      metadata: { 
        userId: user.id,
        notificationId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    logger.error('Unexpected error marking notification as read', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export async function POST(_req: NextRequest) {
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
    const { error: updateError } = await supabase
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
      metadata: { userId: user.id }
    })

    return NextResponse.json({
      success: true,
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