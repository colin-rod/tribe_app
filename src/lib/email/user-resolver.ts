/**
 * User Resolver Service
 * Handles extracting and validating user IDs from email addresses
 */

import { WEBHOOK_CONFIG } from '@/config/webhook'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('UserResolver')

export class UserResolver {
  extractUserIdFromEmail(emailTo: string): string | null {
    try {
      const [localPart, domain] = emailTo.toLowerCase().split('@')
      
      // Validate domain
      if (!this.isAllowedDomain(domain)) {
        return null
      }

      return this.extractUserIdFromLocalPart(localPart)
    } catch (error) {
      logger.error('Error extracting user ID from email', error, { 
        metadata: { emailTo } 
      })
      return null
    }
  }

  isUserEmail(emailTo: string): boolean {
    const recipient = emailTo.toLowerCase()
    return recipient.startsWith(WEBHOOK_CONFIG.EMAIL.USER_EMAIL_PREFIX)
  }

  private isAllowedDomain(domain: string): boolean {
    return WEBHOOK_CONFIG.MAILGUN.ALLOWED_DOMAINS.some(allowedDomain => 
      domain.includes(allowedDomain)
    )
  }

  private extractUserIdFromLocalPart(localPart: string): string | null {
    // Pattern 1: Direct user ID (user123@domain.com)
    if (localPart.startsWith('user')) {
      return localPart.replace('user', '')
    }
    
    // Pattern 2: Prefixed user ID (u-abc123@domain.com)
    if (localPart.startsWith(WEBHOOK_CONFIG.EMAIL.USER_EMAIL_PREFIX)) {
      return localPart.replace(WEBHOOK_CONFIG.EMAIL.USER_EMAIL_PREFIX, '')
    }
    
    // Pattern 3: Just the user ID (abc123@domain.com)
    // Validate it looks like a UUID
    if (WEBHOOK_CONFIG.PATTERNS.UUID.test(localPart)) {
      return localPart
    }
    
    return null
  }
}