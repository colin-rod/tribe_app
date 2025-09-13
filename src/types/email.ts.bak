/**
 * Shared email types and interfaces for webhook processing
 */

export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  url: string
  storagePath?: string
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

export interface WebhookFormData {
  recipient?: string
  sender?: string
  to?: string
  from?: string
  subject: string
  'body-plain'?: string
  'body-html'?: string
  text?: string
  html?: string
  'attachment-count'?: string
  attachments?: string
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
  method?: 'api-key' | 'sendgrid-webhook'
  error?: string
  metadata?: Record<string, unknown>
}