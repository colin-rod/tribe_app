import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
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
    // DEBUG: Log all headers for debugging
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      allHeaders[key] = value
    })
    console.error('=== EMAIL WEBHOOK DEBUG START ===')
    console.error('Headers received:', JSON.stringify(allHeaders, null, 2))
    
    // Validate webhook - either API key or Mailgun signature
    const apiKey = req.headers.get('x-api-key')
    const mailgunSignature = req.headers.get('x-mailgun-signature-256')
    const mailgunTimestamp = req.headers.get('x-mailgun-timestamp')
    const mailgunToken = req.headers.get('x-mailgun-token')
    
    const expectedApiKey = process.env.WEBHOOK_API_KEY
    const mailgunWebhookKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    
    // DEBUG: Log authentication values
    console.error('Auth values:')
    console.error('- API key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING')
    console.error('- Mailgun signature:', mailgunSignature ? `${mailgunSignature.substring(0, 8)}...` : 'MISSING')
    console.error('- timestamp:', mailgunTimestamp || 'MISSING')
    console.error('- token:', mailgunToken ? `${mailgunToken.substring(0, 8)}...` : 'MISSING')
    console.error('- expected API key available:', !!expectedApiKey)
    console.error('- webhook signing key available:', !!mailgunWebhookKey)
    console.error('- webhook signing key length:', mailgunWebhookKey?.length || 0)
    
    let isValidWebhook = false
    
    // Check API key authentication (for direct calls)
    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      console.error('Authentication: API key validated successfully')
      isValidWebhook = true
    }
    
    // Check Mailgun signature authentication
    if (!isValidWebhook && mailgunSignature && mailgunTimestamp && mailgunToken && mailgunWebhookKey) {
      const expectedSignature = crypto
        .createHmac('sha256', mailgunWebhookKey)
        .update(mailgunTimestamp + mailgunToken)
        .digest('hex')
      
      console.error('Mailgun signature validation:')
      console.error('- received:', mailgunSignature)
      console.error('- expected:', expectedSignature)
      console.error('- match:', mailgunSignature === expectedSignature)
      
      if (mailgunSignature === expectedSignature) {
        console.error('Authentication: Mailgun signature validated successfully')
        isValidWebhook = true
      }
    }
    
    // For direct forwarding, Mailgun doesn't send auth headers, so we accept requests from Mailgun IPs
    const xForwardedFor = req.headers.get('x-forwarded-for')
    const userAgent = req.headers.get('user-agent')
    const isMailgunRequest = (
      userAgent === 'Go-http-client/2.0' &&
      (xForwardedFor?.includes('35.206.128.78') || xForwardedFor?.includes('35.210.116.64'))
    )

    console.error('Mailgun direct forwarding check:')
    console.error('- User-Agent:', userAgent)
    console.error('- X-Forwarded-For:', xForwardedFor)
    console.error('- Is Mailgun request:', isMailgunRequest)

    if (!isValidWebhook && !isMailgunRequest) {
      console.error('Authentication FAILED - returning 401')
      logger.warn('Invalid webhook authentication', { 
        metadata: {
          hasApiKey: !!apiKey,
          hasMailgunSignature: !!mailgunSignature,
          ip: xForwardedFor || 'unknown',
          userAgent: userAgent || 'unknown'
        }
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (isMailgunRequest && !isValidWebhook) {
      console.error('Authentication: Mailgun direct forwarding request accepted')
    }
    
    console.error('Authentication passed, processing email...')

    // Parse email data based on content type
    const contentType = req.headers.get('content-type') || ''
    console.error('Step 1: Parsing email data...')
    console.error('Content-Type:', contentType)
    
    let emailData: IncomingEmail
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      console.error('Step 1a: Parsing Mailgun form data')
      // Mailgun sends form data
      const formData = await req.formData()
      emailData = parseMailgunFormData(formData)
    } else {
      console.error('Step 1b: Parsing JSON data')
      // JSON format (for testing or other providers)
      emailData = await req.json()
    }
    
    console.error('Step 2: Email data parsed:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      textLength: emailData.text?.length || 0,
      attachmentCount: emailData.attachments?.length || 0
    })
    
    logger.info('Received email webhook', { 
      metadata: {
        to: emailData.to, 
        from: emailData.from,
        subject: emailData.subject,
        attachmentCount: emailData.attachments?.length || 0,
        contentType
      }
    })

    // Handle different email types with catch-all routing
    const recipient = emailData.to.toLowerCase()
    console.error('Step 3: Processing recipient:', recipient)
    
    // Check if this is a user-specific email
    if (!recipient.startsWith('u-')) {
      console.error('Step 3a: Non-user email, skipping leaf creation')
      logger.info('Non-user email received, skipping leaf creation', { 
        metadata: {
          emailTo: emailData.to,
          emailFrom: emailData.from,
          subject: emailData.subject
        }
      })
      return NextResponse.json({
        success: true,
        message: 'Email received but not processed (not a user email)'
      })
    }
    
    console.error('Step 4: Extracting user ID from email...')
    // Extract user ID from email address (format: u-abc123@domain.com)
    const userId = extractUserIdFromEmail(emailData.to)
    console.error('Step 5: Extracted user ID:', userId)
    
    if (!userId) {
      console.error('Step 5a: Failed to extract user ID')
      logger.warn('Could not extract user ID from email', { metadata: { emailTo: emailData.to } })
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    console.error('Step 6: Creating Supabase service client...')
    // Verify user exists (using service client to bypass RLS)
    const supabase = createServiceClient()
    console.error('Step 7: Querying user profile...')
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    console.error('Step 8: User query result:', { hasUser: !!user, hasError: !!userError })

    if (userError || !user) {
      console.error('Step 8a: User not found')
      logger.warn('User not found for email', { metadata: { userId, emailTo: emailData.to } })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.error('Step 9: Processing email content...')
    // Process email content and attachments
    const { content, mediaUrls, leafType, tags } = await processEmailContent(emailData)
    
    console.error('Step 10: Email content processed:', {
      contentLength: content.length,
      mediaCount: mediaUrls.length,
      leafType,
      tagCount: tags.length
    })

    console.error('Step 11: Creating unassigned leaf...')
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
      console.error('Step 11a: Failed to create leaf')
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

    console.error('Step 12: Leaf created successfully:', {
      leafId: leaf.id,
      leafType: leaf.leaf_type,
      hasMedia: mediaUrls.length > 0
    })
    console.error('=== EMAIL WEBHOOK SUCCESS ===')

    logger.info('Successfully created leaf from email', {
      metadata: {
        leafId: leaf.id,
        userId,
        leafType: leaf.leaf_type,
        hasMedia: mediaUrls.length > 0
      }
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
    console.error('=== EMAIL WEBHOOK ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', (error as any)?.message)
    console.error('Error stack:', (error as any)?.stack)
    console.error('=== EMAIL ERROR END ===')
    
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
        url: `https://storage.colinrodrigues.com/attachments/${Date.now()}-${attachment.name}` // Placeholder
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
    logger.error('Error extracting user ID from email', error, { metadata: { emailTo } })
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