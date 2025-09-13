/**
 * Leaf Creator Service
 * Handles creating leaves in the database
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { IncomingEmail, ProcessedEmailContent, EmailProcessingResult } from '@/types/email'
import { createComponentLogger } from '@/lib/logger'
import { EmailProcessor } from './email-processor'

const logger = createComponentLogger('LeafCreator')

export class LeafCreator {
  private emailProcessor: EmailProcessor

  constructor() {
    this.emailProcessor = new EmailProcessor()
  }

  async createLeafFromEmail(
    supabase: SupabaseClient,
    userId: string,
    emailData: IncomingEmail
  ): Promise<EmailProcessingResult> {
    try {
      // Process email content
      const processedContent = await this.emailProcessor.processEmailContent(emailData)
      const aiCaption = this.emailProcessor.generateAICaption(emailData)

      // Create leaf in database
      const { data: leaf, error: leafError } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          leaf_type: processedContent.leafType,
          content: processedContent.content,
          media_urls: processedContent.mediaUrls,
          tags: processedContent.tags,
          ai_caption: aiCaption,
          ai_tags: [],
          branch_id: null,
          assignment_status: 'unassigned',
          message_type: 'post',
          is_pinned: false
        })
        .select()
        .single()

      if (leafError || !leaf) {
        logger.error('Failed to create leaf in database', leafError, {
          metadata: {
            userId,
            emailFrom: emailData.from,
            subject: emailData.subject,
            leafType: processedContent.leafType,
            contentLength: processedContent.content.length,
            mediaCount: processedContent.mediaUrls.length,
            tagCount: processedContent.tags.length
          }
        })

        return {
          success: false,
          error: 'Failed to create leaf in database'
        }
      }

      logger.info('Successfully created leaf from email', {
        metadata: {
          leafId: leaf.id,
          userId,
          leafType: leaf.leaf_type,
          hasMedia: processedContent.mediaUrls.length > 0,
          tagCount: processedContent.tags.length
        }
      })

      return {
        success: true,
        leafId: leaf.id,
        leafType: leaf.leaf_type,
        hasMedia: processedContent.mediaUrls.length > 0
      }
    } catch (error) {
      logger.error('Unexpected error creating leaf from email', error, {
        metadata: {
          userId,
          emailFrom: emailData.from,
          subject: emailData.subject
        }
      })

      return {
        success: false,
        error: 'Unexpected error occurred'
      }
    }
  }
}