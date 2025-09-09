/**
 * Email Content Processor
 * Handles processing email content and determining leaf types
 */

import { IncomingEmail, ProcessedEmailContent } from '@/types/email'
import { WEBHOOK_CONFIG } from '@/config/webhook'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('EmailProcessor')

export class EmailProcessor {
  async processEmailContent(email: IncomingEmail): Promise<ProcessedEmailContent> {
    const content = this.buildContentFromEmail(email)
    const mediaUrls = this.extractMediaUrls(email)
    const leafType = this.determineLeafType(email, content)
    const tags = this.extractTags(content, email, leafType)

    return {
      content: content.trim(),
      mediaUrls,
      leafType,
      tags
    }
  }

  generateAICaption(email: IncomingEmail): string {
    if (email.subject) {
      return email.subject
    }
    
    if (email.text) {
      const firstSentence = email.text.split('.')[0]
      return firstSentence.length > WEBHOOK_CONFIG.EMAIL.MAX_CAPTION_LENGTH 
        ? email.text.substring(0, WEBHOOK_CONFIG.EMAIL.MAX_CAPTION_LENGTH) + '...'
        : firstSentence
    }
    
    return ''
  }

  private buildContentFromEmail(email: IncomingEmail): string {
    let content = ''

    if (email.subject) {
      content += `Subject: ${email.subject}\n\n`
    }
    
    if (email.text) {
      content += email.text
    }

    return content
  }

  private extractMediaUrls(email: IncomingEmail): string[] {
    if (!email.attachments || email.attachments.length === 0) {
      return []
    }

    return email.attachments
      .filter(attachment => attachment.url && this.isMediaAttachment(attachment.contentType))
      .map(attachment => attachment.url)
  }

  private determineLeafType(
    email: IncomingEmail, 
    content: string
  ): 'photo' | 'video' | 'audio' | 'text' | 'milestone' {
    // Check for milestone keywords first
    if (this.hasMilestoneKeywords(content, email.subject)) {
      return 'milestone'
    }

    // Determine type based on attachments
    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        if (attachment.contentType.startsWith('image/')) {
          return 'photo'
        } else if (attachment.contentType.startsWith('video/')) {
          return 'video'
        } else if (attachment.contentType.startsWith('audio/')) {
          return 'audio'
        }
      }
    }

    return 'text'
  }

  private extractTags(content: string, email: IncomingEmail, leafType: string): string[] {
    const tags: string[] = []

    // Extract hashtags from content
    const hashtagMatches = content.match(WEBHOOK_CONFIG.PATTERNS.HASHTAG)
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.substring(1).toLowerCase()))
    }

    // Add milestone tag if it's a milestone leaf
    if (leafType === 'milestone') {
      tags.push('milestone')
    }

    // Remove duplicates
    return [...new Set(tags)]
  }

  private isMediaAttachment(contentType: string): boolean {
    return (
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('audio/')
    )
  }

  private hasMilestoneKeywords(content: string, subject?: string): boolean {
    const textToCheck = [content, subject || ''].join(' ').toLowerCase()
    
    return WEBHOOK_CONFIG.EMAIL.MILESTONE_KEYWORDS.some(keyword => 
      textToCheck.includes(keyword)
    )
  }
}