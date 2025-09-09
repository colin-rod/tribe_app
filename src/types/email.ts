/**
 * Shared email types and interfaces for webhook processing
 */

export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  url: string
}

export interface IncomingEmail {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
  timestamp?: string
}

export interface MailgunWebhookData {
  recipient: string
  sender: string
  subject: string
  'body-plain': string
  'body-html'?: string
  'attachment-count'?: string
  timestamp: string
  [key: string]: string | undefined
}

export interface ProcessedEmailContent {
  content: string
  mediaUrls: string[]
  leafType: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  tags: string[]
}

export interface EmailProcessingResult {
  success: boolean
  leafId?: string
  leafType?: string
  hasMedia?: boolean
  error?: string
}

export interface AuthenticationResult {
  isValid: boolean
  method?: 'api-key' | 'mailgun-signature' | 'mailgun-ip'
  error?: string
  metadata?: Record<string, any>
}