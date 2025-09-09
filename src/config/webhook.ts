/**
 * Webhook configuration and constants
 */

export const WEBHOOK_CONFIG = {
  // Mailgun configuration
  MAILGUN: {
    USER_AGENT: 'Go-http-client/2.0',
    IP_PREFIXES: ['35.206.', '35.210.', '35.2'],
    ALLOWED_DOMAINS: ['colinrodrigues.com']
  },
  
  // Email processing
  EMAIL: {
    USER_EMAIL_PREFIX: 'u-',
    MILESTONE_KEYWORDS: ['milestone', 'achievement', 'first', 'birthday', 'anniversary'],
    MAX_CAPTION_LENGTH: 100
  },
  
  // Validation
  LIMITS: {
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_EMAIL_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_CONTENT_LENGTH: 5000
  },
  
  // Regex patterns
  PATTERNS: {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    HASHTAG: /#\w+/g
  }
} as const

export function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue
}