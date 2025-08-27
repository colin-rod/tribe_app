import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@treeapp.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // This endpoint should be called by internal services or cron jobs
    // In production, you might want to add an API key or other authentication
    
    // Process pending push notifications from outbox
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('outbox')
      .select(`
        id,
        branch_id,
        post_id,
        payload,
        attempts,
        max_attempts
      `)
      .eq('channel', 'push')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(50) // Process in batches

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications' })
    }

    let processed = 0
    let failed = 0

    for (const notification of pendingNotifications) {
      try {
        // Mark as processing
        await supabase
          .from('outbox')
          .update({ 
            status: 'processing',
            attempts: notification.attempts + 1
          })
          .eq('id', notification.id)

        const { to_user_id, title, body, branch_id, post_id } = notification.payload

        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', to_user_id)

        if (subError) {
          throw new Error(`Failed to get subscriptions: ${subError.message}`)
        }

        if (!subscriptions || subscriptions.length === 0) {
          // No subscriptions for this user, mark as sent
          await supabase
            .from('outbox')
            .update({ 
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', notification.id)
          
          processed++
          continue
        }

        // Send to all user's devices
        const pushPromises = subscriptions.map(async (sub) => {
          const pushPayload = {
            title: title || 'New Activity',
            body: body || 'You have new activity in your branch',
            data: {
              branch_id,
              post_id,
              url: `/dashboard?branch=${branch_id}${post_id ? `&post=${post_id}` : ''}`
            },
            badge: '/icon-192x192.png',
            icon: '/icon-192x192.png'
          }

          return webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            JSON.stringify(pushPayload)
          )
        })

        await Promise.allSettled(pushPromises)

        // Mark as sent
        await supabase
          .from('outbox')
          .update({ 
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        processed++
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        
        // Check if we should retry or mark as failed
        const shouldRetry = notification.attempts < notification.max_attempts
        
        await supabase
          .from('outbox')
          .update({ 
            status: shouldRetry ? 'queued' : 'failed',
            last_error: error instanceof Error ? error.message : 'Unknown error',
            processed_at: shouldRetry ? null : new Date().toISOString()
          })
          .eq('id', notification.id)

        failed++
      }
    }

    return NextResponse.json({ 
      processed,
      failed,
      total: pendingNotifications.length
    })
  } catch (error) {
    console.error('Error in push send endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'push-notification-worker',
    timestamp: new Date().toISOString(),
    vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  })
}