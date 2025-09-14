import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createComponentLogger } from '@/lib/logger'
import { createUnassignedLeaf } from '@/lib/leaf-assignments'
import { AttachmentHandler } from '@/lib/email/attachment-handler'
import { SupabaseClient } from '@supabase/supabase-js'
import { simpleParser } from 'mailparser'
import { withSecurity, withWebhookSecurity } from '@/lib/security/middleware'

const logger = createComponentLogger('SendGridWebhook')

interface SendGridAttachment {
  filename: string
  type: string
  content: string // base64 encoded
}

interface ParsedEmail {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  attachments: SendGridAttachment[]
}

/**
 * Secure SendGrid webhook handler
 */
async function handleSendGridWebhook(req: NextRequest): Promise<NextResponse> {
  try {
    logger.info('SendGrid webhook request received', {
      metadata: {
        contentType: req.headers.get('content-type'),
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for')
      }
    })

    // Parse form data from SendGrid
    const formData = await req.formData()
    
    // Log form data keys for monitoring
    const allFormKeys = Array.from(formData.keys())
    
    logger.info('Complete FormData received from SendGrid', {
      metadata: {
        totalKeys: allFormKeys.length,
        allKeys: allFormKeys,
        attachmentKeys: allFormKeys.filter(key => key.startsWith('attachment')),
        attachmentCount: formData.get('attachments') || '0'
      }
    })
    
    // Check if SendGrid sent raw MIME data
    const rawEmail = formData.get('email') as string
    let emailData: ParsedEmail
    
    if (rawEmail) {
      logger.debug('Processing raw MIME email data', { metadata: { emailLength: rawEmail.length } })
      
      try {
        // Parse the raw MIME email
        const parsed = await simpleParser(rawEmail)
        logger.debug('MIME parsing results', {
          metadata: {
            subject: parsed.subject || 'No subject',
            from: Array.isArray(parsed.from) ? parsed.from[0]?.text : parsed.from?.text || 'Unknown sender',
            to: Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text || 'Unknown recipient',
            attachmentCount: parsed.attachments?.length || 0
          }
        })
        
        emailData = {
          to: Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text || formData.get('to') as string || '',
          from: Array.isArray(parsed.from) ? parsed.from[0]?.text : parsed.from?.text || formData.get('from') as string || '',
          subject: parsed.subject || '',
          text: parsed.text || '',
          html: parsed.html as string || '',
          attachments: []
        }
        
        // Process MIME attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
          logger.debug('Processing MIME attachments', { metadata: { count: parsed.attachments.length } })
          for (const attachment of parsed.attachments) {
            
            if (attachment.content) {
              emailData.attachments.push({
                filename: attachment.filename || 'attachment',
                type: attachment.contentType || 'application/octet-stream',
                content: attachment.content.toString('base64')
              })
            }
          }
        }
        
      } catch (error) {
        console.error('❌ Error parsing MIME email:', error)
        logger.error('Failed to parse raw MIME email', error)
        
        // Fallback to form data parsing
        emailData = {
          to: formData.get('to') as string || '',
          from: formData.get('from') as string || '',
          subject: formData.get('subject') as string || '',
          text: formData.get('text') as string || '',
          html: formData.get('html') as string || '',
          attachments: []
        }
      }
      
    } else {
      logger.debug('Using standard form data parsing (no raw MIME)')
      // Extract email data - SendGrid sends everything directly
      emailData = {
        to: formData.get('to') as string || '',
        from: formData.get('from') as string || '',
        subject: formData.get('subject') as string || '',
        text: formData.get('text') as string || '',
        html: formData.get('html') as string || '',
        attachments: []
      }
    }

    logger.info('Email data received from SendGrid', {
      metadata: {
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        hasText: !!emailData.text,
        hasHtml: !!emailData.html
      }
    })

    // Process attachments - SendGrid sends them as separate form fields
    const attachmentCount = parseInt(formData.get('attachments') as string || '0')
    
    logger.info('Processing SendGrid attachments', {
      metadata: { 
        expectedAttachmentCount: attachmentCount,
        formDataKeys: Array.from(formData.keys()).filter(key => key.startsWith('attachment'))
      }
    })

    for (let i = 1; i <= attachmentCount; i++) {
      const filename = formData.get(`attachment${i}`) as string
      const contentType = formData.get(`attachment${i}_content_type`) as string
      const content = formData.get(`attachment${i}_content`) as string
      
      logger.debug('Processing attachment', {
        metadata: {
          index: i,
          filename: filename || 'missing',
          contentType: contentType || 'missing',
          hasContent: !!content,
          contentLength: content?.length || 0
        }
      })

      const attachment: SendGridAttachment = {
        filename: filename || `attachment${i}`,
        type: contentType || 'application/octet-stream',
        content: content || ''
      }
      
      if (attachment.content) {
        emailData.attachments.push(attachment)
        logger.info('Added attachment to processing queue', {
          metadata: {
            filename: attachment.filename,
            type: attachment.type,
            contentLength: attachment.content.length
          }
        })
      } else {
        logger.warn('Skipping attachment with empty content', {
          metadata: {
            index: i,
            filename: attachment.filename,
            type: attachment.type
          }
        })
      }
    }

    logger.info('Attachment processing summary', {
      metadata: { 
        expectedCount: attachmentCount,
        actualCount: emailData.attachments.length,
        skippedCount: attachmentCount - emailData.attachments.length
      }
    })

    // Handle different email types with support for person-specific routing
    const recipient = emailData.to.toLowerCase()
    logger.debug('Processing recipient', { metadata: { recipient } })
    
    let userId: string | null = null
    let treeId: string | null = null
    let routingType: 'user' | 'person' = 'user'
    
    // Check if this is a person-specific email (person-{treeId}@domain.com)
    if (recipient.startsWith('person-')) {
      treeId = extractTreeIdFromEmail(emailData.to)
      routingType = 'person'
      logger.debug('Person-specific email detected', { metadata: { treeId } })
      
      if (!treeId) {
        logger.warn('Could not extract tree ID from person email', { 
          metadata: { emailTo: emailData.to }
        })
        return NextResponse.json(
          { error: 'Invalid person email address format' },
          { status: 400 }
        )
      }
    }
    // Legacy user-specific email (u-{userId}@domain.com) 
    else if (recipient.startsWith('u-')) {
      userId = extractUserIdFromEmail(emailData.to)
      routingType = 'user'
      logger.debug('User-specific email detected', { metadata: { userId } })
      
      if (!userId) {
        logger.warn('Could not extract user ID from email', { 
          metadata: { emailTo: emailData.to }
        })
        return NextResponse.json(
          { error: 'Invalid user email address format' },
          { status: 400 }
        )
      }
    }
    // Unrecognized email format
    else {
      logger.info('Unrecognized email format, skipping processing', { metadata: { recipient } })
      return NextResponse.json({
        success: true,
        message: 'Email notification received but not processed (unrecognized format)'
      })
    }

    // Initialize Supabase service client
    const supabase = createServiceClient()
    
    let actualUserId: string
    let targetTreeId: string | null = null

    if (routingType === 'person') {
      // For person-specific emails, verify tree exists and get managing user
      const { data: treeData, error: treeError } = await supabase
        .from('trees')
        .select('id, person_name, managed_by, created_by')
        .eq('id', treeId)
        .single()
      
      logger.debug('Tree query completed', { 
        metadata: { treeFound: !!treeData, hasError: !!treeError, treeId } 
      })

      if (treeError || !treeData) {
        logger.warn('Tree not found for person email', { 
          metadata: { treeId, emailTo: emailData.to }
        })
        return NextResponse.json(
          { error: 'Person tree not found' },
          { status: 404 }
        )
      }

      // Use the first manager or creator as the author
      actualUserId = treeData.managed_by.length > 0 ? treeData.managed_by[0] : treeData.created_by
      targetTreeId = treeId
      
      logger.debug('Person routing resolved', { 
        metadata: { 
          personName: treeData.person_name, 
          actualUserId, 
          managedBy: treeData.managed_by 
        }
      })
    } else {
      // Legacy user routing - use the extracted user ID
      actualUserId = userId!
      
      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', actualUserId)
        .single()
      
      logger.debug('User query completed', { 
        metadata: { userFound: !!user, hasError: !!userError } 
      })

      if (userError || !user) {
        logger.warn('User not found for email', { 
          metadata: { userId: actualUserId, emailTo: emailData.to }
        })
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Process email content and attachments
    const { content, mediaUrls, leafType, tags } = await processEmailContent(
      emailData, 
      supabase, 
      actualUserId,
      targetTreeId
    )

    // Create unassigned leaf
    const leaf = await createUnassignedLeaf({
      author_id: actualUserId,
      leaf_type: leafType,
      content: content,
      media_urls: mediaUrls,
      tags: tags,
      ai_caption: generateAICaption(emailData),
    }, supabase)

    if (!leaf) {
      logger.error('Failed to create leaf from email', { 
        metadata: {
          actualUserId, 
          emailFrom: emailData.from,
          subject: emailData.subject,
          routingType,
          targetTreeId
        }
      })
      return NextResponse.json(
        { error: 'Failed to create leaf' },
        { status: 500 }
      )
    }

    logger.info('Successfully created leaf from SendGrid email', {
      metadata: {
        leafId: leaf.id,
        actualUserId,
        leafType: leaf.leaf_type,
        hasMedia: mediaUrls.length > 0,
        routingType,
        targetTreeId
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        leafId: leaf.id,
        leafType: leaf.leaf_type,
        routingType,
        ...(targetTreeId && { targetTreeId }),
        hasMedia: mediaUrls.length > 0
      },
      message: 'Email processed successfully via SendGrid'
    })

  } catch (error) {
    logger.error('Unexpected error in SendGrid webhook', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/webhooks/sendgrid
 * Secure SendGrid webhook endpoint with rate limiting and validation
 */
export const POST = withSecurity(
  withWebhookSecurity(handleSendGridWebhook, {
    // Verify SendGrid API key if provided
    secretHeader: 'x-sendgrid-api-key',
    expectedSecret: process.env.SENDGRID_API_KEY,
    // TODO: Add HMAC verification when SendGrid provides webhook secrets
    // hmacHeader: 'x-sendgrid-signature',
    // hmacSecret: process.env.SENDGRID_WEBHOOK_SECRET
  }),
  {
    rateLimit: 'webhooks',
    allowedMethods: ['POST'],
    // Allow SendGrid IPs (add specific IPs in production)
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? [] // Add SendGrid IPs here
      : ['*'] // Allow all in development
  }
)

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
 * Extract tree ID from person-specific email address
 * Supports: person-{treeId}@domain.com
 */
function extractTreeIdFromEmail(emailTo: string): string | null {
  try {
    const [localPart, domain] = emailTo.toLowerCase().split('@')
    
    // Check if it's our domain
    if (!domain.includes('colinrodrigues.com')) {
      return null
    }
    
    // Person-specific pattern: person-abc123@colinrodrigues.com
    if (localPart.startsWith('person-')) {
      const treeId = localPart.replace('person-', '')
      // Validate it looks like a UUID
      if (treeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        return treeId
      }
    }
    
    return null
  } catch (error) {
    logger.error('Error extracting tree ID from email', { metadata: { emailTo, error } })
    return null
  }
}

/**
 * Process email content and determine leaf type
 */
async function processEmailContent(
  email: ParsedEmail,
  supabase: SupabaseClient,
  userId: string,
  targetTreeId?: string | null
): Promise<{
  content: string
  mediaUrls: string[]
  leafType: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  tags: string[]
}> {
  let content = ''
  const mediaUrls: string[] = []
  let leafType: 'photo' | 'video' | 'audio' | 'text' | 'milestone' = 'text'
  const tags: string[] = []

  // Add person context if this is a person-specific email
  if (targetTreeId) {
    try {
      const { data: treeData } = await supabase
        .from('trees')
        .select('person_name')
        .eq('id', targetTreeId)
        .single()
      
      if (treeData?.person_name) {
        content += `📧 Email for: ${treeData.person_name}\n\n`
      }
    } catch (error) {
      logger.warn('Could not fetch tree person name for context', { 
        metadata: { targetTreeId, error }
      })
    }
  }

  // Build content from email
  if (email.subject) {
    content += `Subject: ${email.subject}\n\n`
  }
  
  if (email.text) {
    content += email.text
  } else if (email.html) {
    // Basic HTML to text conversion for fallback
    content += email.html.replace(/<[^>]*>/g, '').trim()
  }

  // Process attachments - upload base64 content to Supabase Storage
  if (email.attachments && email.attachments.length > 0) {
    const attachmentHandler = new AttachmentHandler(supabase)
    const emailId = `sendgrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.info('Processing email attachments for upload', {
      metadata: {
        attachmentCount: email.attachments.length,
        userId,
        emailId,
        attachmentDetails: email.attachments.map(att => ({
          filename: att.filename,
          type: att.type,
          contentLength: att.content.length,
          contentPreview: att.content.substring(0, 50) + '...'
        }))
      }
    })

    // Upload all attachments
    const uploadedAttachments = await attachmentHandler.uploadMultipleBase64Attachments(
      email.attachments,
      userId,
      emailId
    )

    logger.info('Attachment upload results', {
      metadata: {
        requested: email.attachments.length,
        uploaded: uploadedAttachments.length,
        failed: email.attachments.length - uploadedAttachments.length,
        userId,
        emailId,
        uploadedFiles: uploadedAttachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          url: att.url
        }))
      }
    })

    // Add URLs to mediaUrls and determine leaf type
    for (const uploadedAttachment of uploadedAttachments) {
      mediaUrls.push(uploadedAttachment.url)
      
      logger.debug('Processing uploaded attachment', {
        metadata: {
          filename: uploadedAttachment.filename,
          contentType: uploadedAttachment.contentType,
          url: uploadedAttachment.url,
          currentLeafType: leafType
        }
      })
      
      // Determine leaf type based on attachment
      if (uploadedAttachment.contentType.startsWith('image/')) {
        leafType = 'photo'
        logger.debug('Set leaf type to photo', { metadata: { contentType: uploadedAttachment.contentType } })
      } else if (uploadedAttachment.contentType.startsWith('video/')) {
        leafType = 'video'
        logger.debug('Set leaf type to video', { metadata: { contentType: uploadedAttachment.contentType } })
      } else if (uploadedAttachment.contentType.startsWith('audio/')) {
        leafType = 'audio'
        logger.debug('Set leaf type to audio', { metadata: { contentType: uploadedAttachment.contentType } })
      }
    }
    
    // Add note about attachments to content
    const successCount = uploadedAttachments.length
    const failedCount = email.attachments.length - successCount
    
    if (successCount > 0) {
      content += `\n\n[${successCount} media file(s) attached]`
    }
    if (failedCount > 0) {
      content += `\n\n[${failedCount} attachment(s) failed to upload]`
    }
  } else {
    logger.debug('No attachments found', {
      metadata: {
        attachmentsLength: email.attachments ? email.attachments.length : 'null/undefined',
        subject: email.subject
      }
    })
    
    logger.info('No attachments found in email', {
      metadata: {
        attachmentsArray: email.attachments,
        attachmentsLength: email.attachments ? email.attachments.length : 'null/undefined',
        userId,
        emailSubject: email.subject
      }
    })
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
function generateAICaption(email: ParsedEmail): string {
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