/**
 * Email Parser Service
 * Handles parsing different email formats (Mailgun, JSON, etc.)
 */

import { NextRequest } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { IncomingEmail, EmailAttachment } from '@/types/email'
import { createComponentLogger } from '@/lib/logger'
import { AttachmentHandler } from './attachment-handler'

const logger = createComponentLogger('EmailParser')

export class EmailParser {
  private attachmentHandler: AttachmentHandler | null = null

  constructor(supabase?: SupabaseClient) {
    if (supabase) {
      this.attachmentHandler = new AttachmentHandler(supabase)
    }
  }
  async parseEmail(req: NextRequest, userId?: string): Promise<IncomingEmail> {
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return this.parseMailgunFormData(req, userId)
    } else if (contentType.includes('application/json')) {
      return this.parseJsonData(req)
    } else {
      throw new Error(`Unsupported content type: ${contentType}`)
    }
  }

  private async parseMailgunFormData(req: NextRequest, userId?: string): Promise<IncomingEmail> {
    try {
      const formData = await req.formData()
      return this.convertMailgunFormData(formData, userId)
    } catch (error) {
      logger.error('Failed to parse Mailgun form data', error)
      throw new Error('Invalid Mailgun form data')
    }
  }

  private async parseJsonData(req: NextRequest): Promise<IncomingEmail> {
    try {
      const data = await req.json()
      return this.validateJsonEmailData(data)
    } catch (error) {
      logger.error('Failed to parse JSON email data', error)
      throw new Error('Invalid JSON email data')
    }
  }

  private async convertMailgunFormData(formData: FormData, userId?: string): Promise<IncomingEmail> {
    const attachments: EmailAttachment[] = []
    
    // Parse attachments
    const attachmentCount = parseInt(formData.get('attachment-count') as string) || 0
    
    if (attachmentCount > 0 && this.attachmentHandler && userId) {
      const emailId = this.generateEmailId(formData)
      const attachmentFiles: File[] = []
      
      // Collect all attachment files
      for (let i = 1; i <= attachmentCount; i++) {
        const attachment = formData.get(`attachment-${i}`) as File
        if (attachment && attachment.size > 0) {
          attachmentFiles.push(attachment)
        }
      }
      
      // Upload all attachments
      if (attachmentFiles.length > 0) {
        logger.info('Uploading attachments to storage', {
          metadata: {
            attachmentCount: attachmentFiles.length,
            userId,
            emailId
          }
        })
        
        const uploadedAttachments = await this.attachmentHandler.uploadMultipleAttachments(
          attachmentFiles,
          userId,
          emailId
        )
        
        attachments.push(...uploadedAttachments)
        
        logger.info('Successfully uploaded attachments', {
          metadata: {
            requested: attachmentFiles.length,
            uploaded: uploadedAttachments.length,
            userId,
            emailId
          }
        })
      }
    } else if (attachmentCount > 0) {
      // If we can't upload attachments, just create metadata for them
      logger.warn('Cannot upload attachments - missing handler or userId', {
        metadata: {
          attachmentCount,
          hasHandler: !!this.attachmentHandler,
          hasUserId: !!userId
        }
      })
      
      for (let i = 1; i <= attachmentCount; i++) {
        const attachment = formData.get(`attachment-${i}`) as File
        if (attachment && attachment.size > 0) {
          attachments.push({
            filename: attachment.name,
            contentType: attachment.type,
            size: attachment.size,
            url: '' // No URL since we couldn't upload
          })
        }
      }
    }

    return {
      to: formData.get('recipient') as string || '',
      from: formData.get('sender') as string || '',
      subject: formData.get('subject') as string || '',
      text: formData.get('body-plain') as string || '',
      html: formData.get('body-html') as string || undefined,
      attachments,
      timestamp: formData.get('timestamp') as string || undefined
    }
  }

  private validateJsonEmailData(data: any): IncomingEmail {
    // Basic validation for JSON email data
    if (!data.to || !data.from) {
      throw new Error('Missing required email fields (to, from)')
    }

    return {
      to: String(data.to),
      from: String(data.from),
      subject: String(data.subject || ''),
      text: String(data.text || ''),
      html: data.html ? String(data.html) : undefined,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      timestamp: data.timestamp ? String(data.timestamp) : undefined
    }
  }

  private generateEmailId(formData: FormData): string {
    // Generate a unique email ID from timestamp and message-id or timestamp alone
    const messageId = formData.get('Message-Id') as string
    const timestamp = formData.get('timestamp') as string || Date.now().toString()
    
    if (messageId) {
      // Use a hash of the message ID for consistency
      return messageId.replace(/[<>@]/g, '').replace(/\./g, '_')
    }
    
    return `email_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  }
}