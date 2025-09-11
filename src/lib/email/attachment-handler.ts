/**
 * Attachment Handler Service
 * Handles uploading email attachments to cloud storage
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { EmailAttachment } from '@/types/email'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('AttachmentHandler')

export class AttachmentHandler {
  constructor(private supabase: SupabaseClient) {}

  async uploadAttachment(
    file: File, 
    userId: string,
    emailId: string
  ): Promise<EmailAttachment | null> {
    try {
      // Generate safe filename
      const timestamp = Date.now()
      const safeFileName = this.sanitizeFileName(file.name)
      const storagePath = `email-attachments/${userId}/${emailId}/${timestamp}-${safeFileName}`

      logger.info('Uploading attachment to storage', {
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          storagePath,
          userId,
          emailId
        }
      })

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('media')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (error) {
        logger.error('Failed to upload attachment to storage', error, {
          metadata: {
            fileName: file.name,
            storagePath,
            userId,
            emailId
          }
        })
        return null
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('media')
        .getPublicUrl(storagePath)

      if (!urlData.publicUrl) {
        logger.error('Failed to get public URL for uploaded attachment', {
          metadata: {
            fileName: file.name,
            storagePath,
            userId,
            emailId
          }
        })
        return null
      }

      logger.info('Successfully uploaded attachment', {
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          publicUrl: urlData.publicUrl,
          storagePath,
          userId,
          emailId
        }
      })

      return {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        url: urlData.publicUrl,
        storagePath: storagePath
      }
    } catch (error) {
      logger.error('Unexpected error uploading attachment', error, {
        metadata: {
          fileName: file.name,
          userId,
          emailId
        }
      })
      return null
    }
  }

  async uploadBase64Attachment(
    base64Content: string,
    filename: string,
    contentType: string,
    userId: string,
    emailId: string
  ): Promise<EmailAttachment | null> {
    try {
      // Decode base64 content
      const buffer = Buffer.from(base64Content, 'base64')
      const size = buffer.length

      // Generate safe filename
      const timestamp = Date.now()
      const safeFileName = this.sanitizeFileName(filename)
      const storagePath = `email-attachments/${userId}/${emailId}/${timestamp}-${safeFileName}`

      logger.info('Uploading base64 attachment to storage', {
        metadata: {
          fileName: filename,
          fileSize: size,
          contentType,
          storagePath,
          userId,
          emailId
        }
      })

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('media')
        .upload(storagePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType
        })

      if (error) {
        logger.error('Failed to upload base64 attachment to storage', error, {
          metadata: {
            fileName: filename,
            storagePath,
            userId,
            emailId
          }
        })
        return null
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('media')
        .getPublicUrl(storagePath)

      if (!urlData.publicUrl) {
        logger.error('Failed to get public URL for uploaded base64 attachment', {
          metadata: {
            fileName: filename,
            storagePath,
            userId,
            emailId
          }
        })
        return null
      }

      logger.info('Successfully uploaded base64 attachment', {
        metadata: {
          fileName: filename,
          fileSize: size,
          publicUrl: urlData.publicUrl,
          storagePath,
          userId,
          emailId
        }
      })

      return {
        filename,
        contentType,
        size,
        url: urlData.publicUrl,
        storagePath: storagePath
      }
    } catch (error) {
      logger.error('Unexpected error uploading base64 attachment', error, {
        metadata: {
          fileName: filename,
          userId,
          emailId
        }
      })
      return null
    }
  }

  async uploadMultipleAttachments(
    files: File[],
    userId: string,
    emailId: string
  ): Promise<EmailAttachment[]> {
    const uploadPromises = files.map(file => 
      this.uploadAttachment(file, userId, emailId)
    )

    const results = await Promise.allSettled(uploadPromises)
    
    return results
      .filter((result): result is PromiseFulfilledResult<EmailAttachment> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }

  async uploadMultipleBase64Attachments(
    attachments: Array<{
      content: string
      filename: string
      type: string
    }>,
    userId: string,
    emailId: string
  ): Promise<EmailAttachment[]> {
    const uploadPromises = attachments.map(attachment => 
      this.uploadBase64Attachment(
        attachment.content,
        attachment.filename,
        attachment.type,
        userId,
        emailId
      )
    )

    const results = await Promise.allSettled(uploadPromises)
    
    return results
      .filter((result): result is PromiseFulfilledResult<EmailAttachment> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }

  private sanitizeFileName(fileName: string): string {
    // Remove unsafe characters and limit length
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100)
  }

  async deleteAttachment(storagePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from('media')
        .remove([storagePath])

      if (error) {
        logger.error('Failed to delete attachment from storage', error, {
          metadata: { storagePath }
        })
      } else {
        logger.info('Successfully deleted attachment', {
          metadata: { storagePath }
        })
      }
    } catch (error) {
      logger.error('Unexpected error deleting attachment', error, {
        metadata: { storagePath }
      })
    }
  }
}