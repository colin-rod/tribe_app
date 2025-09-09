/**
 * Email Parser Service
 * Handles parsing different email formats (Mailgun, JSON, etc.)
 */

import { NextRequest } from 'next/server'
import { IncomingEmail, EmailAttachment } from '@/types/email'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('EmailParser')

export class EmailParser {
  async parseEmail(req: NextRequest): Promise<IncomingEmail> {
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return this.parseMailgunFormData(req)
    } else if (contentType.includes('application/json')) {
      return this.parseJsonData(req)
    } else {
      throw new Error(`Unsupported content type: ${contentType}`)
    }
  }

  private async parseMailgunFormData(req: NextRequest): Promise<IncomingEmail> {
    try {
      const formData = await req.formData()
      return this.convertMailgunFormData(formData)
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

  private convertMailgunFormData(formData: FormData): IncomingEmail {
    const attachments: EmailAttachment[] = []
    
    // Parse attachments
    const attachmentCount = parseInt(formData.get('attachment-count') as string) || 0
    
    for (let i = 1; i <= attachmentCount; i++) {
      const attachment = formData.get(`attachment-${i}`) as File
      if (attachment && attachment.size > 0) {
        attachments.push({
          filename: attachment.name,
          contentType: attachment.type,
          size: attachment.size,
          url: this.generateAttachmentUrl(attachment)
        })
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

  private generateAttachmentUrl(attachment: File): string {
    // TODO: Implement proper file upload to cloud storage
    // For now, generate a placeholder URL
    const timestamp = Date.now()
    const safeName = encodeURIComponent(attachment.name)
    return `https://storage.colinrodrigues.com/attachments/${timestamp}-${safeName}`
  }
}