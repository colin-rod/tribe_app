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
  private userResolver: UserResolver
  private leafCreator: LeafCreator

  constructor() {
    this.userResolver = new UserResolver()
    this.leafCreator = new LeafCreator()
  }

  async processEmailWebhook(
    req: NextRequest,
    supabase: SupabaseClient
  ): Promise<EmailProcessingResult> {
    try {
      // First, do a quick check to extract userId for attachment handling
      const formData = await req.formData()
      const recipient = formData.get('recipient') as string || ''
      
      // Check if this is a user email first (before parsing attachments)
      if (!this.userResolver.isUserEmail(recipient)) {
        logger.info('Non-user email received, skipping processing', {
          metadata: {
            emailTo: recipient,
            emailFrom: formData.get('sender') as string || '',
            subject: formData.get('subject') as string || ''
          }
        })
        
        return {
          success: true,
          error: 'Email received but not processed (not a user email)'
        }
      }

      // Extract user ID for attachment handling
      const userId = this.userResolver.extractUserIdFromEmail(recipient)
      if (!userId) {
        logger.warn('Could not extract user ID from email', {
          metadata: { emailTo: recipient }
        })
        
        return {
          success: false,
          error: 'Invalid email address format'
        }
      }

      // Reconstruct the request with the form data for the parser
      const newReq = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: formData
      }) as NextRequest

      // Create parser with Supabase client and parse email data
      const emailParser = new EmailParser(supabase)
      const emailData = await emailParser.parseEmail(newReq, userId)
      
      logger.info('Email parsed successfully', {
        metadata: {
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject,
          textLength: emailData.text?.length || 0,
          attachmentCount: emailData.attachments?.length || 0
        }
      })

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