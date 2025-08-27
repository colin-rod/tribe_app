import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Note: This is a placeholder for SMS functionality using Twilio
// Uncomment and configure when ready to implement SMS
// import twilio from 'twilio'

// const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
//   ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
//   : null

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if SMS is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'SMS service not configured' }, { status: 501 })
    }

    // Process pending SMS notifications from outbox
    const { data: pendingSMS, error: fetchError } = await supabase
      .from('outbox')
      .select(`
        id,
        branch_id,
        post_id,
        payload,
        attempts,
        max_attempts
      `)
      .eq('channel', 'sms')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10) // Process in small batches for SMS

    if (fetchError) {
      console.error('Error fetching pending SMS:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch SMS notifications' }, { status: 500 })
    }

    if (!pendingSMS || pendingSMS.length === 0) {
      return NextResponse.json({ message: 'No pending SMS notifications' })
    }

    let processed = 0
    let failed = 0

    for (const sms of pendingSMS) {
      try {
        // Mark as processing
        await supabase
          .from('outbox')
          .update({ 
            status: 'processing',
            attempts: sms.attempts + 1
          })
          .eq('id', sms.id)

        const { 
          to_user_id, 
          branch_name, 
          author_name, 
          post_content, 
          milestone_type 
        } = sms.payload

        // Get user's phone number and SMS preferences
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('phone, first_name')
          .eq('id', to_user_id)
          .single()

        if (userError || !userData || !userData.phone) {
          // No phone number, mark as sent (can't send)
          await supabase
            .from('outbox')
            .update({ 
              status: 'sent',
              processed_at: new Date().toISOString(),
              last_error: 'No phone number available'
            })
            .eq('id', sms.id)
          
          processed++
          continue
        }

        // Create SMS content
        const message = createSMSMessage({
          branchName: branch_name,
          authorName: author_name,
          postContent: post_content,
          milestoneType: milestone_type
        })

        // TODO: Uncomment when ready to implement Twilio
        // if (!twilioClient) {
        //   throw new Error('Twilio client not configured')
        // }

        // await twilioClient.messages.create({
        //   body: message,
        //   from: process.env.TWILIO_PHONE_NUMBER,
        //   to: userData.phone
        // })

        // For now, just log the SMS (remove when Twilio is implemented)
        console.log(`SMS would be sent to ${userData.phone}: ${message}`)

        // Mark as sent
        await supabase
          .from('outbox')
          .update({ 
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', sms.id)

        processed++
      } catch (error) {
        console.error(`Error processing SMS ${sms.id}:`, error)
        
        // Check if we should retry or mark as failed
        const shouldRetry = sms.attempts < sms.max_attempts
        
        await supabase
          .from('outbox')
          .update({ 
            status: shouldRetry ? 'queued' : 'failed',
            last_error: error instanceof Error ? error.message : 'Unknown error',
            processed_at: shouldRetry ? null : new Date().toISOString()
          })
          .eq('id', sms.id)

        failed++
      }
    }

    return NextResponse.json({ 
      processed,
      failed,
      total: pendingSMS.length,
      note: 'SMS functionality is stubbed - configure Twilio to enable'
    })
  } catch (error) {
    console.error('Error in SMS send endpoint:', error)
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
    service: 'sms-notification-worker',
    timestamp: new Date().toISOString(),
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    note: 'SMS functionality requires Twilio configuration'
  })
}

interface SMSMessageProps {
  branchName: string
  authorName: string
  postContent: string
  milestoneType?: string
}

function createSMSMessage({
  branchName,
  authorName,
  postContent,
  milestoneType
}: SMSMessageProps): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.treeapp.com'
  
  if (milestoneType) {
    return `🎉 ${authorName} shared a ${milestoneType.replace('_', ' ')} milestone in ${branchName}! View in Tree: ${baseUrl}/dashboard`
  }

  if (postContent) {
    const truncatedContent = postContent.length > 100 
      ? postContent.substring(0, 97) + '...'
      : postContent
    
    return `📱 ${authorName} in ${branchName}: "${truncatedContent}" View: ${baseUrl}/dashboard`
  }

  return `📱 ${authorName} shared something new in ${branchName}. View in Tree: ${baseUrl}/dashboard`
}