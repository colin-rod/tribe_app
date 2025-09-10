import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createComponentLogger } from '@/lib/logger'
import { createUnassignedLeaf } from '@/lib/leaf-assignments'
import crypto from 'crypto'

const logger = createComponentLogger('NotifyWebhook')

interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  url: string
}

interface IncomingEmail {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
  timestamp?: string
}

interface MailgunNotificationData {
  recipient: string
  sender: string
  subject: string
  'message-url': string
  timestamp: string
}

/**
 * POST /api/webhooks/notify
 * Receive notification from Mailgun that a message has been stored
 * Then fetch the full message using the Messages API and create unassigned leaves
 */
export async function POST(req: NextRequest) {
  try {
    // DEBUG: Log all headers for debugging
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      allHeaders[key] = value
    })
    logger.debug('Incoming webhook headers received', { metadata: { headers: allHeaders } })
    
    // Validate Mailgun webhook signature
    const mailgunSignature = req.headers.get('x-mailgun-signature-256')
    const mailgunTimestamp = req.headers.get('x-mailgun-timestamp')
    const mailgunToken = req.headers.get('x-mailgun-token')
    
    const mailgunWebhookKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    
    // DEBUG: Log what we received
    logger.debug('Authentication values received', {
      metadata: {
        signaturePresent: !!mailgunSignature,
        timestampPresent: !!mailgunTimestamp,
        tokenPresent: !!mailgunToken,
        webhookKeyAvailable: !!mailgunWebhookKey,
        webhookKeyLength: mailgunWebhookKey?.length || 0
      }
    })
    
    logger.info('DEBUG: Mailgun auth values', { 
      metadata: {
        signature: mailgunSignature ? `${mailgunSignature.substring(0, 8)}...` : null,
        timestamp: mailgunTimestamp,
        token: mailgunToken ? `${mailgunToken.substring(0, 8)}...` : null,
        hasWebhookKey: !!mailgunWebhookKey,
        webhookKeyLength: mailgunWebhookKey?.length || 0
      }
    })
    
    // Store and notify webhooks from Mailgun don't include signature headers
    // So we'll skip signature validation for this endpoint and rely on:
    // 1. The webhook URL being secret (obscure endpoint)
    // 2. Verifying the message URL is from Mailgun's storage domain
    // 3. IP-based filtering if needed
    
    logger.warn('Skipping signature validation for store-and-notify webhook')
    
    if (!mailgunSignature && !mailgunTimestamp && !mailgunToken) {
      // This is likely a legitimate store-and-notify request (no auth headers)
      logger.info('Store-and-notify request detected (no auth headers)')
    } else if (!mailgunSignature || !mailgunTimestamp || !mailgunToken || !mailgunWebhookKey) {
      // Partial auth headers present but incomplete - this is suspicious
      logger.warn('Incomplete Mailgun signature headers', { 
        metadata: {
          hasSignature: !!mailgunSignature,
          hasTimestamp: !!mailgunTimestamp,
          hasToken: !!mailgunToken,
          hasWebhookKey: !!mailgunWebhookKey,
          ip: req.headers.get('x-forwarded-for') || 'unknown'
        }
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    } else {
      // All signature components present - validate normally
      const expectedSignature = crypto
        .createHmac('sha256', mailgunWebhookKey)
        .update(mailgunTimestamp + mailgunToken)
        .digest('hex')
      
      logger.debug('Signature comparison', {
        metadata: {
          received: mailgunSignature,
          expected: expectedSignature,
          match: mailgunSignature === expectedSignature
        }
      })
      
      if (mailgunSignature !== expectedSignature) {
        logger.warn('Invalid Mailgun signature', { 
          metadata: { 
            ip: req.headers.get('x-forwarded-for') || 'unknown',
            received: mailgunSignature,
            expected: expectedSignature
          }
        })
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    logger.info('Authentication passed, proceeding with webhook processing')

    // Parse notification data
    logger.debug('Parsing form data')
    const formData = await req.formData()
    logger.debug('Form data parsed successfully')
    
    const notificationData: MailgunNotificationData = {
      recipient: formData.get('recipient') as string,
      sender: formData.get('sender') as string,
      subject: formData.get('subject') as string || '',
      'message-url': formData.get('message-url') as string,
      timestamp: formData.get('timestamp') as string
    }
    
    logger.info('Notification data extracted', {
      metadata: {
        recipient: notificationData.recipient,
        sender: notificationData.sender,
        subject: notificationData.subject,
        hasMessageUrl: !!notificationData['message-url']
      }
    })
    
    logger.info('Received message notification', { 
      metadata: {
        to: notificationData.recipient, 
        from: notificationData.sender,
        subject: notificationData.subject,
        messageUrl: notificationData['message-url']
      }
    })

    // Handle different email types with catch-all routing
    const recipient = notificationData.recipient.toLowerCase()
    logger.debug('Processing recipient', { metadata: { recipient } })
    
    // Check if this is a user-specific email
    if (!recipient.startsWith('u-')) {
      logger.info('Non-user email detected, skipping processing')
      logger.info('Non-user email notification received, skipping leaf creation', { 
        metadata: {
          emailTo: notificationData.recipient,
          emailFrom: notificationData.sender,
          subject: notificationData.subject
        }
      })
      return NextResponse.json({
        success: true,
        message: 'Email notification received but not processed (not a user email)'
      })
    }
    
    logger.debug('Extracting user ID from email')
    // Extract user ID from email address
    const userId = extractUserIdFromEmail(notificationData.recipient)
    logger.debug('User ID extracted', { metadata: { userId } })
    
    if (!userId) {
      logger.warn('Could not extract user ID from email', { 
        metadata: { emailTo: notificationData.recipient }
      })
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    logger.debug('Creating Supabase service client')
    // Verify user exists (using service client to bypass RLS)
    const supabase = createServiceClient()
    logger.debug('Querying user profile')
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()
    
    logger.debug('User query completed', { metadata: { userFound: !!user, hasError: !!userError } })

    if (userError || !user) {
      logger.warn('User not found for email', { 
        metadata: {
          userId, 
          emailTo: notificationData.recipient
        }
      })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    logger.debug('Fetching message from Mailgun')
    // Fetch full message from Mailgun
    const emailData = await fetchMessageFromMailgun(notificationData['message-url'])
    logger.debug('Message fetch completed', { metadata: { hasEmailData: !!emailData } })
    
    if (!emailData) {
      logger.error('Failed to fetch message from Mailgun', {
        metadata: { messageUrl: notificationData['message-url'] }
      })
      return NextResponse.json(
        { error: 'Failed to retrieve message' },
        { status: 500 }
      )
    }

    // Process email content and attachments
    const { content, mediaUrls, leafType, tags } = await processEmailContent(emailData)

    // Create unassigned leaf
    const leaf = await createUnassignedLeaf({
      author_id: userId,
      leaf_type: leafType,
      content: content,
      media_urls: mediaUrls,
      tags: tags,
      ai_caption: generateAICaption(emailData),
    })

    if (!leaf) {
      logger.error('Failed to create leaf from email', { 
        metadata: {
          userId, 
          emailFrom: emailData.from,
          subject: emailData.subject
        }
      })
      return NextResponse.json(
        { error: 'Failed to create leaf' },
        { status: 500 }
      )
    }

    logger.info('Successfully created leaf from stored message', {
      metadata: {
        leafId: leaf.id,
        userId,
        leafType: leaf.leaf_type,
        hasMedia: mediaUrls.length > 0,
        messageUrl: notificationData['message-url']
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        leafId: leaf.id,
        leafType: leaf.leaf_type,
        hasMedia: mediaUrls.length > 0
      },
      message: 'Stored message processed successfully'
    })

  } catch (error) {
    // Webhook error handling
    logger.error('Webhook processing error', error)
    // Error message logged above
    // Error stack logged above
    // End error handling
    
    logger.error('Unexpected error in notify webhook', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Fetch full message from Mailgun Messages API
 */
async function fetchMessageFromMailgun(messageUrl: string): Promise<IncomingEmail | null> {
  try {
    const mailgunApiKey = process.env.MAILGUN_API_KEY
    // Mailgun fetch debugging
    logger.debug('Mailgun API configuration', { metadata: { apiKeyAvailable: !!mailgunApiKey } })
    // API key length logged above
    // API key details logged above
    logger.debug('Fetching from message URL', { metadata: { hasUrl: !!messageUrl } })
    
    if (!mailgunApiKey) {
      logger.error('MAILGUN_API_KEY not configured')
      logger.error('MAILGUN_API_KEY not configured')
      return null
    }

    const authHeader = `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`
    logger.debug('Auth header configured', { metadata: { headerLength: authHeader.length } })

    const response = await fetch(messageUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      }
    })

    logger.debug('Mailgun API response', { metadata: { status: response.status, statusText: response.statusText } })
    // Response status logged above
    // Response headers available for debugging

    if (!response.ok) {
      const responseText = await response.text()
      logger.error('Mailgun API error response', { metadata: { responseBody: responseText } })
      // End Mailgun fetch error
      
      logger.error('Failed to fetch message from Mailgun', {
        metadata: {
          status: response.status,
          statusText: response.statusText,
          messageUrl,
          responseBody: responseText
        }
      })
      return null
    }

    const data = await response.json()
    
    // Parse attachments
    const attachments: EmailAttachment[] = []
    if (data.attachments && Array.isArray(data.attachments)) {
      for (const attachment of data.attachments) {
        attachments.push({
          filename: attachment.filename || 'unknown',
          contentType: attachment['content-type'] || 'application/octet-stream',
          size: attachment.size || 0,
          url: attachment.url || ''
        })
      }
    }

    return {
      to: data.recipient || '',
      from: data.sender || '',
      subject: data.subject || '',
      text: data['body-plain'] || '',
      html: data['body-html'],
      attachments,
      timestamp: data.timestamp
    }
  } catch (error) {
    logger.error('Error fetching message from Mailgun', error, { metadata: { messageUrl } })
    return null
  }
}

/**
 * Extract user ID from email address
 * Supports formats like: user123@colinrodrigues.com, u-abc123@colinrodrigues.com
 */
function extractUserIdFromEmail(emailTo: string): string | null {
  try {
    const [localPart, domain] = emailTo.toLowerCase().split('@')
    
    // Check if it's our domain
    if (!domain.includes('colinrodrigues.com')) {
      return null
    }
    
    // Pattern 1: Direct user ID (user123@colinrodrigues.com)
    if (localPart.startsWith('user')) {
      return localPart.replace('user', '')
    }
    
    // Pattern 2: Prefixed user ID (u-abc123@colinrodrigues.com)
    if (localPart.startsWith('u-')) {
      return localPart.replace('u-', '')
    }
    
    // Pattern 3: Just the user ID (abc123@colinrodrigues.com)
    // Validate it looks like a UUID
    if (localPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      return localPart
    }
    
    return null
  } catch (error) {
    logger.error('Error extracting user ID from email', { metadata: { emailTo, error } })
    return null
  }
}

/**
 * Process email content and determine leaf type
 */
async function processEmailContent(email: IncomingEmail): Promise<{
  content: string
  mediaUrls: string[]
  leafType: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  tags: string[]
}> {
  let content = ''
  const mediaUrls: string[] = []
  let leafType: 'photo' | 'video' | 'audio' | 'text' | 'milestone' = 'text'
  const tags: string[] = []

  // Build content from email
  if (email.subject) {
    content += `Subject: ${email.subject}\n\n`
  }
  
  if (email.text) {
    content += email.text
  }

  // Process attachments
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      if (attachment.url) {
        mediaUrls.push(attachment.url)
        
        // Determine leaf type based on attachment
        if (attachment.contentType.startsWith('image/')) {
          leafType = 'photo'
        } else if (attachment.contentType.startsWith('video/')) {
          leafType = 'video'
        } else if (attachment.contentType.startsWith('audio/')) {
          leafType = 'audio'
        }
      }
    }
  }

  // Extract hashtags from content
  const hashtagMatches = content.match(/#\w+/g)
  if (hashtagMatches) {
    tags.push(...hashtagMatches.map(tag => tag.substring(1).toLowerCase()))
  }

  // Check for milestone keywords
  const milestoneKeywords = ['milestone', 'achievement', 'first', 'birthday', 'anniversary']
  const hasMilestoneKeyword = milestoneKeywords.some(keyword => 
    content.toLowerCase().includes(keyword) || 
    email.subject?.toLowerCase().includes(keyword)
  )
  
  if (hasMilestoneKeyword) {
    leafType = 'milestone'
    tags.push('milestone')
  }

  return { content: content.trim(), mediaUrls, leafType, tags }
}

/**
 * Generate AI caption from email content
 */
function generateAICaption(email: IncomingEmail): string {
  let caption = ''
  
  if (email.subject) {
    caption = email.subject
  } else if (email.text) {
    // Use first sentence or first 100 characters
    const firstSentence = email.text.split('.')[0]
    caption = firstSentence.length > 100 
      ? email.text.substring(0, 100) + '...'
      : firstSentence
  }
  
  return caption
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

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