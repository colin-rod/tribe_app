import { NextRequest, NextResponse } from 'next/server'
import { createComponentLogger } from '@/lib/logger'
import { notificationDelivery } from '@/lib/notifications/delivery'
import { notificationScheduler } from '@/lib/notifications/scheduler'

const logger = createComponentLogger('NotificationCron')

/**
 * POST /api/cron/notifications
 * Cron job endpoint for processing notifications
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job attempt', {
        metadata: { authHeader: authHeader?.substring(0, 20) + '...' }
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'process'

    logger.info('Processing notification cron job', {
      metadata: { action }
    })

    switch (action) {
      case 'process':
        // Process pending notifications
        await notificationDelivery.processNotificationQueue(100)
        break

      case 'retry':
        // Retry failed notifications
        await notificationDelivery.retryFailedNotifications()
        break

      case 'cleanup':
        // Clean up old notifications
        await notificationDelivery.cleanupOldNotifications()
        break

      case 'digest_daily':
        // Generate daily digests
        await notificationScheduler.generateDigests('daily')
        break

      case 'digest_weekly':
        // Generate weekly digests
        await notificationScheduler.generateDigests('weekly')
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }

    logger.info('Notification cron job completed successfully', {
      metadata: { action }
    })

    return NextResponse.json({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      message: `Notification ${action} completed successfully`
    })

  } catch (error) {
    logger.error('Notification cron job failed', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for health checks
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'notification-cron',
    timestamp: new Date().toISOString()
  })
}