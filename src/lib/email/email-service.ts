/**
 * Email Service - Main coordinator for email webhook processing
 */

import { NextRequest } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { EmailProcessingResult } from '@/types/email'
import { createComponentLogger } from '@/lib/logger'
import { EmailParser } from './email-parser'
import { UserResolver } from './user-resolver'
import { LeafCreator } from './leaf-creator'

const logger = createComponentLogger('EmailService')

export class EmailService {
  private emailParser: EmailParser
  private userResolver: UserResolver
  private leafCreator: LeafCreator

  constructor() {
    this.emailParser = new EmailParser()
    this.userResolver = new UserResolver()
    this.leafCreator = new LeafCreator()
  }

  async processEmailWebhook(
    req: NextRequest,
    supabase: SupabaseClient
  ): Promise<EmailProcessingResult> {
    try {
      // Parse email data
      const emailData = await this.emailParser.parseEmail(req)
      
      logger.info('Email parsed successfully', {
        metadata: {
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject,
          textLength: emailData.text?.length || 0,
          attachmentCount: emailData.attachments?.length || 0
        }
      })

      // Check if this is a user email
      if (!this.userResolver.isUserEmail(emailData.to)) {
        logger.info('Non-user email received, skipping processing', {
          metadata: {
            emailTo: emailData.to,
            emailFrom: emailData.from,
            subject: emailData.subject
          }
        })
        
        return {
          success: true,
          error: 'Email received but not processed (not a user email)'
        }
      }

      // Extract user ID
      const userId = this.userResolver.extractUserIdFromEmail(emailData.to)
      if (!userId) {
        logger.warn('Could not extract user ID from email', {
          metadata: { emailTo: emailData.to }
        })
        
        return {
          success: false,
          error: 'Invalid email address format'
        }
      }

      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        logger.warn('User not found for email', {
          metadata: { userId, emailTo: emailData.to }
        })
        
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Create leaf from email
      const result = await this.leafCreator.createLeafFromEmail(
        supabase,
        userId,
        emailData
      )

      return result
    } catch (error) {
      logger.error('Unexpected error in email processing', error)
      
      return {
        success: false,
        error: 'Internal processing error'
      }
    }
  }
}