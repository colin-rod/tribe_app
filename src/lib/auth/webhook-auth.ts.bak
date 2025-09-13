/**
 * Webhook Authentication Service
 */

import { NextRequest } from 'next/server'
import { AuthenticationResult } from '@/types/email'
import { getOptionalEnvVar } from '@/config/webhook'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('WebhookAuth')

export class WebhookAuthenticator {
  private readonly webhookApiKey: string | undefined

  constructor() {
    this.webhookApiKey = getOptionalEnvVar('WEBHOOK_API_KEY')
  }

  async authenticate(req: NextRequest): Promise<AuthenticationResult> {
    // SendGrid webhooks don't require signature validation
    // We use API key authentication for our webhooks
    const apiKeyResult = this.validateApiKey(req)
    if (apiKeyResult.isValid) {
      return apiKeyResult
    }

    // For SendGrid Parse webhooks, we can allow without authentication
    // as they come directly from SendGrid's servers
    const isSendGridWebhook = this.isSendGridWebhook(req)
    if (isSendGridWebhook) {
      return {
        isValid: true,
        method: 'sendgrid-webhook',
        metadata: {
          userAgent: req.headers.get('user-agent') || 'unknown',
          ip: req.headers.get('x-forwarded-for') || 'unknown'
        }
      }
    }

    logger.warn('Authentication failed', {
      metadata: {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        hasApiKey: !!req.headers.get('x-api-key')
      }
    })

    return {
      isValid: false,
      error: 'Authentication failed - no valid credentials provided'
    }
  }

  private validateApiKey(req: NextRequest): AuthenticationResult {
    const apiKey = req.headers.get('x-api-key')
    
    if (!apiKey || !this.webhookApiKey) {
      return { isValid: false }
    }

    if (apiKey === this.webhookApiKey) {
      return {
        isValid: true,
        method: 'api-key',
        metadata: { authenticated: true }
      }
    }

    return {
      isValid: false,
      error: 'Invalid API key'
    }
  }

  private isSendGridWebhook(req: NextRequest): boolean {
    const userAgent = req.headers.get('user-agent') || ''
    const contentType = req.headers.get('content-type') || ''
    
    // SendGrid Parse webhooks typically use a specific user agent and content type
    return userAgent.includes('SendGrid') || 
           contentType.includes('multipart/form-data') ||
           contentType.includes('application/x-www-form-urlencoded')
  }
}