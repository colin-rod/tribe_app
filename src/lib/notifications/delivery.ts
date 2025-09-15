import { createServiceClient } from '@/lib/supabase/service'
import { createComponentLogger } from '@/lib/logger'
import sgMail from '@sendgrid/mail'
import type { 
  NotificationQueue, 
  InAppNotification, 
  UserNotificationPreferences 
} from '@/types/database'

const logger = createComponentLogger('NotificationDelivery')

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
} else {
  logger.warn('SendGrid API key not configured - email notifications will be disabled')
}

interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
}

interface NotificationContext {
  user_name?: string
  memory_title?: string
  branch_name?: string
  tree_name?: string
  sender_name?: string
  error_message?: string
  [key: string]: any
}

export class NotificationDeliveryService {
  private supabase = createServiceClient()

  /**
   * Process pending notifications from the queue
   */
  async processNotificationQueue(batchSize: number = 50): Promise<void> {
    try {
      logger.info('Processing notification queue', { metadata: { batchSize } })

      // Get pending notifications from queue
      const { data: queueItems, error } = await this.supabase
        .from('notification_queue')
        .select(`
          *,
          user_notification_preferences (*)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(batchSize)

      if (error) {
        logger.error('Failed to fetch notification queue', error)
        return
      }

      if (!queueItems || queueItems.length === 0) {
        logger.info('No pending notifications to process')
        return
      }

      logger.info('Processing notifications', { 
        metadata: { count: queueItems.length } 
      })

      // Process each notification
      for (const item of queueItems) {
        await this.processNotificationItem(item)
      }

    } catch (error) {
      logger.error('Unexpected error processing notification queue', error)
    }
  }

  /**
   * Process a single notification item
   */
  private async processNotificationItem(item: NotificationQueue): Promise<void> {
    try {
      logger.info('Processing notification item', {
        metadata: { 
          notificationId: item.id,
          type: item.notification_type,
          userId: item.user_id
        }
      })

      // Mark as processing
      await this.supabase
        .from('notification_queue')
        .update({ 
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id)

      const preferences = (item as unknown as { user_notification_preferences: UserNotificationPreferences }).user_notification_preferences
      const context = (item as unknown as { metadata: unknown }).metadata as NotificationContext || {}

      // Determine delivery methods based on preferences
      const shouldSendEmail = this.shouldSendEmail(item.notification_type, preferences)
      const shouldSendInApp = this.shouldSendInApp(item.notification_type, preferences)

      const deliveryResults = {
        email: false,
        inapp: false,
        errors: [] as string[]
      }

      // Send email notification
      if (shouldSendEmail) {
        try {
          await this.sendEmailNotification(item, context)
          deliveryResults.email = true
          logger.info('Email notification sent successfully', {
            metadata: { notificationId: item.id }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          deliveryResults.errors.push(`Email: ${errorMessage}`)
          logger.error('Failed to send email notification', error, {
            metadata: { notificationId: item.id }
          })
        }
      }

      // Send in-app notification
      if (shouldSendInApp) {
        try {
          await this.sendInAppNotification(item, context)
          deliveryResults.inapp = true
          logger.info('In-app notification sent successfully', {
            metadata: { notificationId: item.id }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          deliveryResults.errors.push(`InApp: ${errorMessage}`)
          logger.error('Failed to send in-app notification', error, {
            metadata: { notificationId: item.id }
          })
        }
      }

      // Update queue item status
      const finalStatus = deliveryResults.errors.length > 0 ? 'failed' : 'completed'
      
      await this.supabase
        .from('notification_queue')
        .update({
          status: finalStatus,
          delivered_at: finalStatus === 'completed' ? new Date().toISOString() : null,
          delivery_attempts: ((item as unknown as { delivery_attempts: number }).delivery_attempts || 0) + 1,
          last_error: deliveryResults.errors.length > 0 ? deliveryResults.errors.join('; ') : null
        })
        .eq('id', item.id)

      // Log to notification history
      await this.supabase
        .from('notification_history')
        .insert({
          notification_id: item.id,
          user_id: item.user_id,
          notification_type: item.notification_type,
          delivery_method: [
            deliveryResults.email && 'email',
            deliveryResults.inapp && 'inapp'
          ].filter(Boolean).join(',') || 'none',
          status: finalStatus,
          delivered_at: finalStatus === 'completed' ? new Date().toISOString() : null,
          error_message: deliveryResults.errors.length > 0 ? deliveryResults.errors.join('; ') : null,
          metadata: {
            title: item.title,
            context: context
          }
        })

      logger.info('Notification processing completed', {
        metadata: {
          notificationId: item.id,
          status: finalStatus,
          emailSent: deliveryResults.email,
          inAppSent: deliveryResults.inapp,
          errors: deliveryResults.errors
        }
      })

    } catch (error) {
      logger.error('Failed to process notification item', error, {
        metadata: { notificationId: item.id }
      })

      // Mark as failed
      await this.supabase
        .from('notification_queue')
        .update({
          status: 'failed',
          delivery_attempts: ((item as unknown as { delivery_attempts: number }).delivery_attempts || 0) + 1,
          last_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', item.id)
    }
  }

  /**
   * Check if email should be sent based on notification type and user preferences
   */
  private shouldSendEmail(type: string, preferences: UserNotificationPreferences): boolean {
    const emailPreferenceMap: Record<string, keyof UserNotificationPreferences> = {
      'memory.new': 'email_new_memories',
      'memory.assigned': 'email_memory_assignments',
      'memory.processing': 'email_memory_processing',
      'email.processing.success': 'email_processing_success',
      'email.processing.failed': 'email_processing_failed',
      'branch.invitation': 'email_branch_invitations',
      'tree.invitation': 'email_tree_invitations',
      'branch.activity': 'email_branch_activity',
      'system.update': 'email_system_updates',
      'digest.daily': 'email_daily_digest',
      'digest.weekly': 'email_weekly_digest'
    }

    const preferenceKey = emailPreferenceMap[type]
    return preferenceKey ? Boolean(preferences[preferenceKey]) : false
  }

  /**
   * Check if in-app notification should be sent based on notification type and user preferences
   */
  private shouldSendInApp(type: string, preferences: UserNotificationPreferences): boolean {
    const inAppPreferenceMap: Record<string, keyof UserNotificationPreferences> = {
      'memory.new': 'inapp_new_memories',
      'memory.assigned': 'inapp_memory_assignments',
      'branch.invitation': 'inapp_branch_invitations',
      'tree.invitation': 'inapp_tree_invitations',
      'system.update': 'inapp_system_updates'
    }

    const preferenceKey = inAppPreferenceMap[type]
    return preferenceKey ? Boolean(preferences[preferenceKey]) : false
  }

  /**
   * Send email notification using SendGrid
   */
  private async sendEmailNotification(
    item: NotificationQueue, 
    context: NotificationContext
  ): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured')
    }

    // Get user email
    const { data: user, error: userError } = await this.supabase.auth.admin.getUserById(item.user_id)
    
    if (userError || !user.user?.email) {
      throw new Error('Failed to get user email')
    }

    const template = this.getEmailTemplate(item.notification_type, item.title, item.message, context)
    
    const msg = {
      to: user.user.email,
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      subject: template.subject,
      text: template.textContent,
      html: template.htmlContent,
    }

    await sgMail.send(msg)
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    item: NotificationQueue,
    context: NotificationContext
  ): Promise<void> {
    const { error } = await this.supabase
      .from('inapp_notifications')
      .insert({
        user_id: item.user_id,
        notification_type: item.notification_type,
        title: item.title,
        message: item.message,
        context_type: item.context_type,
        context_id: item.context_id,
        metadata: context,
        is_read: false,
        expires_at: this.getExpirationDate(item.notification_type)
      })

    if (error) {
      throw error
    }
  }

  /**
   * Get email template based on notification type
   */
  private getEmailTemplate(
    type: string, 
    title: string, 
    message: string, 
    context: NotificationContext
  ): EmailTemplate {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Default template
    let subject = title
    let htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1f2937; margin: 0 0 16px 0;">${title}</h2>
          <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.5;">${message}</p>
          <a href="${baseUrl}/dashboard" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View in Dashboard
          </a>
        </div>
        <div style="margin-top: 20px; padding: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>You can manage your notification preferences in your <a href="${baseUrl}/settings/notifications">account settings</a>.</p>
        </div>
      </div>
    `
    let textContent = `${title}\n\n${message}\n\nView in Dashboard: ${baseUrl}/dashboard\n\nManage notifications: ${baseUrl}/settings/notifications`

    // Customize templates based on notification type
    switch (type) {
      case 'memory.new':
        subject = `New Memory: ${context.memory_title || title}`
        break
      case 'memory.assigned':
        subject = `Memory Assigned: ${context.memory_title || title}`
        break
      case 'email.processing.failed':
        subject = `Email Processing Failed: ${context.memory_title || title}`
        break
      case 'branch.invitation':
        subject = `Branch Invitation: ${context.branch_name || title}`
        break
      case 'tree.invitation':
        subject = `Tree Invitation: ${context.tree_name || title}`
        break
    }

    return { subject, htmlContent, textContent }
  }

  /**
   * Get expiration date for in-app notifications
   */
  private getExpirationDate(type: string): string | null {
    const expirationDays: Record<string, number> = {
      'memory.new': 30,
      'memory.assigned': 60,
      'branch.invitation': 14,
      'tree.invitation': 14,
      'system.update': 90
    }

    const days = expirationDays[type]
    if (!days) return null

    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + days)
    return expirationDate.toISOString()
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(maxAttempts: number = 3): Promise<void> {
    try {
      logger.info('Retrying failed notifications', { metadata: { maxAttempts } })

      const { data: failedItems, error } = await this.supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'failed')
        .lt('delivery_attempts', maxAttempts)
        .order('created_at', { ascending: true })
        .limit(25)

      if (error) {
        logger.error('Failed to fetch failed notifications', error)
        return
      }

      if (!failedItems || failedItems.length === 0) {
        logger.info('No failed notifications to retry')
        return
      }

      logger.info('Retrying failed notifications', { 
        metadata: { count: failedItems.length } 
      })

      // Reset status to pending for retry
      const itemIds = failedItems.map(item => item.id)
      await this.supabase
        .from('notification_queue')
        .update({ 
          status: 'pending',
          last_error: null 
        })
        .in('id', itemIds)

      // Process the retries
      await this.processNotificationQueue(failedItems.length)

    } catch (error) {
      logger.error('Unexpected error retrying failed notifications', error)
    }
  }

  /**
   * Clean up old processed notifications
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<void> {
    try {
      logger.info('Cleaning up old notifications', { metadata: { daysToKeep } })

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      // Clean up queue
      const { error: queueError } = await this.supabase
        .from('notification_queue')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('created_at', cutoffDate.toISOString())

      if (queueError) {
        logger.error('Failed to clean up notification queue', queueError)
      }

      // Clean up history
      const { error: historyError } = await this.supabase
        .from('notification_history')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (historyError) {
        logger.error('Failed to clean up notification history', historyError)
      }

      // Clean up expired in-app notifications
      const { error: inappError } = await this.supabase
        .from('inapp_notifications')
        .delete()
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString())

      if (inappError) {
        logger.error('Failed to clean up expired in-app notifications', inappError)
      }

      logger.info('Notification cleanup completed')

    } catch (error) {
      logger.error('Unexpected error during notification cleanup', error)
    }
  }
}

// Export singleton instance
export const notificationDelivery = new NotificationDeliveryService()