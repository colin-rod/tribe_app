import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Initialize Resend (or your preferred email service)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    
    // Process pending email notifications from outbox
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('outbox')
      .select(`
        id,
        branch_id,
        post_id,
        payload,
        attempts,
        max_attempts
      `)
      .eq('channel', 'email')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(20) // Process in smaller batches for email

    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ message: 'No pending emails' })
    }

    let processed = 0
    let failed = 0

    for (const email of pendingEmails) {
      try {
        // Mark as processing
        await supabase
          .from('outbox')
          .update({ 
            status: 'processing',
            attempts: email.attempts + 1
          })
          .eq('id', email.id)

        const { 
          to_user_id, 
          branch_name, 
          author_name, 
          post_content, 
          has_media, 
          milestone_type 
        } = email.payload

        // Get user's email and preferences
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email, first_name')
          .eq('id', to_user_id)
          .single()

        if (userError || !userData) {
          throw new Error(`Failed to get user data: ${userError?.message}`)
        }

        // Check if user wants email notifications (you can add this to user settings)
        // For now, we'll send to everyone

        // Create email content
        const subject = milestone_type 
          ? `🎉 ${author_name} shared a milestone in ${branch_name}`
          : `📱 ${author_name} shared something new in ${branch_name}`

        const htmlContent = createEmailTemplate({
          recipientName: userData.first_name || 'there',
          branchName: branch_name,
          authorName: author_name,
          postContent: post_content,
          hasMedia: has_media,
          milestoneType: milestone_type,
          branchId: email.branch_id,
          postId: email.post_id
        })

        // Send email
        const { error: sendError } = await resend.emails.send({
          from: process.env.FROM_EMAIL || 'Tree <noreply@treeapp.com>',
          to: [userData.email],
          subject,
          html: htmlContent,
          headers: {
            'X-Branch-ID': email.branch_id,
            'X-Post-ID': email.post_id || ''
          }
        })

        if (sendError) {
          throw new Error(`Failed to send email: ${sendError.message}`)
        }

        // Mark as sent
        await supabase
          .from('outbox')
          .update({ 
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', email.id)

        processed++
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
        
        // Check if we should retry or mark as failed
        const shouldRetry = email.attempts < email.max_attempts
        
        await supabase
          .from('outbox')
          .update({ 
            status: shouldRetry ? 'queued' : 'failed',
            last_error: error instanceof Error ? error.message : 'Unknown error',
            processed_at: shouldRetry ? null : new Date().toISOString()
          })
          .eq('id', email.id)

        failed++
      }
    }

    return NextResponse.json({ 
      processed,
      failed,
      total: pendingEmails.length
    })
  } catch (error) {
    console.error('Error in email send endpoint:', error)
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
    service: 'email-notification-worker',
    timestamp: new Date().toISOString(),
    emailConfigured: !!process.env.RESEND_API_KEY
  })
}

interface EmailTemplateProps {
  recipientName: string
  branchName: string
  authorName: string
  postContent: string
  hasMedia: boolean
  milestoneType?: string
  branchId: string
  postId?: string
}

function createEmailTemplate({
  recipientName,
  branchName,
  authorName,
  postContent,
  hasMedia,
  milestoneType,
  branchId,
  postId
}: EmailTemplateProps): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.treeapp.com'
  const viewUrl = `${baseUrl}/dashboard?branch=${branchId}${postId ? `&post=${postId}` : ''}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New activity in ${branchName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .milestone { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0; }
    .post-content { background: #f8fafc; border-radius: 6px; padding: 16px; margin: 16px 0; font-style: italic; }
    .cta { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
    .media-indicator { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌳 Tree</h1>
      <p>New activity in ${branchName}</p>
    </div>
    
    <div class="content">
      <h2>Hi ${recipientName}!</h2>
      
      ${milestoneType ? `
        <div class="milestone">
          <strong>🎉 Milestone Moment!</strong><br>
          ${authorName} shared a ${milestoneType.replace('_', ' ')} milestone
        </div>
      ` : ''}
      
      <p><strong>${authorName}</strong> shared something new in <strong>${branchName}</strong>:</p>
      
      ${postContent ? `
        <div class="post-content">
          "${postContent}"
        </div>
      ` : ''}
      
      ${hasMedia ? `
        <p class="media-indicator">📸 This post includes photos or videos</p>
      ` : ''}
      
      <div class="cta">
        <a href="${viewUrl}" class="button">View in Tree</a>
      </div>
      
      <p>Stay connected with your family's precious moments.</p>
    </div>
    
    <div class="footer">
      <p>You're receiving this because you're a member of ${branchName}.</p>
      <p><a href="${baseUrl}/settings">Update your notification preferences</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}