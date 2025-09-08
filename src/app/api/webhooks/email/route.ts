import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createComponentLogger } from '@/lib/logger'
import { createUnassignedLeaf } from '@/lib/leaf-assignments'
import crypto from 'crypto'

const logger = createComponentLogger('EmailWebhook')

interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  url: string
}

// Generic email interface
interface IncomingEmail {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
  timestamp?: string
}

// Mailgun-specific interface
interface MailgunWebhookData {
  recipient: string
  sender: string
  subject: string
  'body-plain': string
  'body-html'?: string
  'attachment-count'?: string
  timestamp: string
  // Attachments are handled separately in Mailgun
  [key: string]: string | undefined
}

/**
 * POST /api/webhooks/email
 * Receive emails from email service (e.g., Mailgun, SendGrid) and create unassigned leaves
 */
export async function POST(req: NextRequest) {
  try {
    // Validate webhook - either API key or Mailgun signature
    const apiKey = req.headers.get('x-api-key')
    const mailgunSignature = req.headers.get('x-mailgun-signature-256')
    const mailgunTimestamp = req.headers.get('x-mailgun-timestamp')
    const mailgunToken = req.headers.get('x-mailgun-token')
    
    const expectedApiKey = process.env.WEBHOOK_API_KEY
    const mailgunWebhookKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    
    let isValidWebhook = false
    
    // Check API key authentication (for direct calls)
    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      isValidWebhook = true
    }
    
    // Check Mailgun signature authentication
    if (!isValidWebhook && mailgunSignature && mailgunTimestamp && mailgunToken && mailgunWebhookKey) {
      const expectedSignature = crypto
        .createHmac('sha256', mailgunWebhookKey)
        .update(mailgunTimestamp + mailgunToken)
        .digest('hex')
      
      if (mailgunSignature === expectedSignature) {
        isValidWebhook = true
      }
    }
    
    if (!isValidWebhook) {
      logger.warn('Invalid webhook authentication', { 
        hasApiKey: !!apiKey,
        hasMailgunSignature: !!mailgunSignature,
        ip: req.ip 
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse email data based on content type
    const contentType = req.headers.get('content-type') || ''
    let emailData: IncomingEmail
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Mailgun sends form data
      const formData = await req.formData()
      emailData = parseMailgunFormData(formData)
    } else {
      // JSON format (for testing or other providers)
      emailData = await req.json()
    }
    
    logger.info('Received email webhook', { 
      to: emailData.to, 
      from: emailData.from,
      subject: emailData.subject,
      attachmentCount: emailData.attachments?.length || 0,
      contentType
    })

    // Extract user ID from email address (format: user123@tribe.app or custom format)
    const userId = extractUserIdFromEmail(emailData.to)
    
    if (!userId) {
      logger.warn('Could not extract user ID from email', { emailTo: emailData.to })
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Verify user exists
    const supabase = await createClient()
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      logger.warn('User not found for email', { userId, emailTo: emailData.to })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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
        userId, 
        emailFrom: emailData.from,
        subject: emailData.subject
      })
      return NextResponse.json(
        { error: 'Failed to create leaf' },
        { status: 500 }
      )
    }

    logger.info('Successfully created leaf from email', {
      leafId: leaf.id,
      userId,
      leafType: leaf.leaf_type,
      hasMedia: mediaUrls.length > 0
    })

    return NextResponse.json({
      success: true,
      data: {
        leafId: leaf.id,
        leafType: leaf.leaf_type,
        hasMedia: mediaUrls.length > 0
      },
      message: 'Email processed successfully'
    })

  } catch (error) {
    logger.error('Unexpected error in email webhook', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Parse Mailgun form data into our standard email format
 */
function parseMailgunFormData(formData: FormData): IncomingEmail {
  const attachments: EmailAttachment[] = []
  
  // Get attachment count and parse attachments
  const attachmentCount = parseInt(formData.get('attachment-count') as string) || 0
  
  for (let i = 1; i <= attachmentCount; i++) {
    const attachment = formData.get(`attachment-${i}`) as File
    if (attachment) {
      // In production, you'd upload this file to your storage service
      // For now, we'll create a placeholder URL
      attachments.push({
        filename: attachment.name,
        contentType: attachment.type,
        size: attachment.size,
        url: `https://storage.tribe.app/attachments/${Date.now()}-${attachment.name}` // Placeholder
      })
    }
  }
  
  return {
    to: formData.get('recipient') as string,
    from: formData.get('sender') as string,
    subject: formData.get('subject') as string || '',
    text: formData.get('body-plain') as string || '',
    html: formData.get('body-html') as string,
    attachments,
    timestamp: formData.get('timestamp') as string
  }
}

/**
 * Extract user ID from email address
 * Supports formats like: user123@tribe.app, u-abc123@inbox.tribe.app
 */
function extractUserIdFromEmail(emailTo: string): string | null {
  try {
    const [localPart, domain] = emailTo.toLowerCase().split('@')
    
    // Check if it's our domain
    if (!domain.includes('tribe.app')) {
      return null
    }
    
    // Pattern 1: Direct user ID (user123@tribe.app)
    if (localPart.startsWith('user')) {
      return localPart.replace('user', '')
    }
    
    // Pattern 2: Prefixed user ID (u-abc123@inbox.tribe.app)
    if (localPart.startsWith('u-')) {
      return localPart.replace('u-', '')
    }
    
    // Pattern 3: Just the user ID (abc123@tribe.app)
    // Validate it looks like a UUID
    if (localPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      return localPart
    }
    
    return null
  } catch (error) {
    logger.error('Error extracting user ID from email', error, { emailTo })
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
    tags = hashtagMatches.map(tag => tag.substring(1).toLowerCase())
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