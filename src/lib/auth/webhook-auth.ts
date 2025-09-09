/**
 * Webhook Authentication Service
 */

import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { AuthenticationResult } from '@/types/email'
import { WEBHOOK_CONFIG, getRequiredEnvVar, getOptionalEnvVar } from '@/config/webhook'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('WebhookAuth')

export class WebhookAuthenticator {
  private readonly webhookApiKey: string | undefined
  private readonly mailgunWebhookKey: string | undefined

  constructor() {
    this.webhookApiKey = getOptionalEnvVar('WEBHOOK_API_KEY')
    this.mailgunWebhookKey = getOptionalEnvVar('MAILGUN_WEBHOOK_SIGNING_KEY')
  }

  async authenticate(req: NextRequest): Promise<AuthenticationResult> {
    // Try API key authentication first
    const apiKeyResult = this.validateApiKey(req)
    if (apiKeyResult.isValid) {
      return apiKeyResult
    }

    // Try Mailgun signature authentication
    const signatureResult = this.validateMailgunSignature(req)
    if (signatureResult.isValid) {
      return signatureResult
    }

    // Try Mailgun IP-based authentication (for direct forwarding)
    const ipResult = this.validateMailgunIP(req)
    if (ipResult.isValid) {
      return ipResult
    }

    logger.warn('Authentication failed', {
      metadata: {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        hasApiKey: !!req.headers.get('x-api-key'),
        hasMailgunSignature: !!req.headers.get('x-mailgun-signature-256')
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

  private validateMailgunSignature(req: NextRequest): AuthenticationResult {
    const signature = req.headers.get('x-mailgun-signature-256')
    const timestamp = req.headers.get('x-mailgun-timestamp')
    const token = req.headers.get('x-mailgun-token')

    if (!signature || !timestamp || !token || !this.mailgunWebhookKey) {
      return { isValid: false }
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.mailgunWebhookKey)
        .update(timestamp + token)
        .digest('hex')

      if (signature === expectedSignature) {
        return {
          isValid: true,
          method: 'mailgun-signature',
          metadata: { timestamp, token }
        }
      }

      return {
        isValid: false,
        error: 'Invalid Mailgun signature'
      }
    } catch (error) {
      logger.error('Error validating Mailgun signature', error)
      return {
        isValid: false,
        error: 'Signature validation failed'
      }
    }
  }

  private validateMailgunIP(req: NextRequest): AuthenticationResult {
    const userAgent = req.headers.get('user-agent')
    const xForwardedFor = req.headers.get('x-forwarded-for')

    // Check for Mailgun's signature: Go-http-client/2.0 user agent and Google Cloud IP
    if (userAgent !== WEBHOOK_CONFIG.MAILGUN.USER_AGENT || !xForwardedFor) {
      return { isValid: false }
    }

    const isMailgunIP = WEBHOOK_CONFIG.MAILGUN.IP_PREFIXES.some(prefix => 
      xForwardedFor.startsWith(prefix)
    )

    if (isMailgunIP) {
      return {
        isValid: true,
        method: 'mailgun-ip',
        metadata: { 
          userAgent, 
          ip: xForwardedFor,
          source: 'direct-forwarding'
        }
      }
    }

    return {
      isValid: false,
      error: 'Request not from recognized Mailgun IP'
    }
  }
}