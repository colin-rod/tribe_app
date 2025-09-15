import { createServiceClient } from '@/lib/supabase/service'
import { createComponentLogger } from '@/lib/logger'
import { notificationDelivery } from './delivery'

const logger = createComponentLogger('NotificationScheduler')

export class NotificationSchedulerService {
  private supabase = createServiceClient()
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  /**
   * Start the notification processor
   */
  start(intervalMs: number = 30000): void {
    if (this.isRunning) {
      logger.warn('Notification scheduler is already running')
      return
    }

    logger.info('Starting notification scheduler', { 
      metadata: { intervalMs } 
    })

    this.isRunning = true
    
    // Process immediately
    this.processNotifications()

    // Set up recurring processing
    this.intervalId = setInterval(() => {
      this.processNotifications()
    }, intervalMs)
  }

  /**
   * Stop the notification processor
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Notification scheduler is not running')
      return
    }

    logger.info('Stopping notification scheduler')

    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Process notifications once
   */
  private async processNotifications(): Promise<void> {
    if (!this.isRunning) return

    try {
      // Process pending notifications
      await notificationDelivery.processNotificationQueue()

      // Retry failed notifications (every 5th run, approximately)
      if (Math.random() < 0.2) {
        await notificationDelivery.retryFailedNotifications()
      }

      // Cleanup old notifications (once per day, approximately)
      if (Math.random() < 0.001) {
        await notificationDelivery.cleanupOldNotifications()
      }

    } catch (error) {
      logger.error('Error during notification processing cycle', error)
    }
  }

  /**
   * Get processor status
   */
  getStatus(): { isRunning: boolean; intervalId: number | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId ? Number(this.intervalId) : null
    }
  }

  /**
   * Queue a notification for delivery
   */
  async queueNotification(params: {
    userId: string
    type: string
    title: string
    message: string
    contextType?: string
    contextId?: string
    metadata?: Record<string, unknown>
    scheduledFor?: Date
  }): Promise<string | null> {
    try {
      const { data: notificationId, error } = await this.supabase
        .rpc('queue_notification', {
          target_user_id: params.userId,
          notif_type: params.type,
          notif_title: params.title,
          notif_message: params.message,
          ctx_type: params.contextType || null,
          ctx_id: params.contextId || null,
          metadata_json: params.metadata || {},
          schedule_for: params.scheduledFor?.toISOString() || new Date().toISOString()
        })

      if (error) {
        logger.error('Failed to queue notification', error, {
          metadata: { 
            userId: params.userId,
            type: params.type 
          }
        })
        return null
      }

      logger.info('Notification queued successfully', {
        metadata: {
          notificationId,
          userId: params.userId,
          type: params.type
        }
      })

      return notificationId

    } catch (error) {
      logger.error('Unexpected error queueing notification', error)
      return null
    }
  }

  /**
   * Generate digest notifications for users
   */
  async generateDigests(type: 'daily' | 'weekly'): Promise<void> {
    try {
      logger.info('Generating digest notifications', { metadata: { type } })

      // Get users who have digest notifications enabled
      const digestField = type === 'daily' ? 'email_daily_digest' : 'email_weekly_digest'
      
      const { data: users, error } = await this.supabase
        .from('user_notification_preferences')
        .select('user_id')
        .eq(digestField, true)

      if (error) {
        logger.error('Failed to fetch users for digest', error)
        return
      }

      if (!users || users.length === 0) {
        logger.info('No users found for digest notifications', { metadata: { type } })
        return
      }

      logger.info('Generating digests for users', { 
        metadata: { type, userCount: users.length } 
      })

      // Generate digest for each user
      for (const user of users) {
        await this.generateUserDigest(user.user_id, type)
      }

    } catch (error) {
      logger.error('Unexpected error generating digests', error)
    }
  }

  /**
   * Generate digest for a specific user
   */
  private async generateUserDigest(userId: string, type: 'daily' | 'weekly'): Promise<void> {
    try {
      // Calculate date range for digest
      const endDate = new Date()
      const startDate = new Date()
      
      if (type === 'daily') {
        startDate.setDate(startDate.getDate() - 1)
      } else {
        startDate.setDate(startDate.getDate() - 7)
      }

      // Get recent activity for user
      const { data: recentMemories, error: memoriesError } = await this.supabase
        .from('memories')
        .select('id, title, created_at')
        .or(`created_by.eq.${userId},assigned_to.cs.{${userId}}`)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      if (memoriesError) {
        logger.error('Failed to fetch recent memories for digest', memoriesError, {
          metadata: { userId, type }
        })
        return
      }

      // Skip if no activity
      if (!recentMemories || recentMemories.length === 0) {
        logger.info('No recent activity for user digest', {
          metadata: { userId, type }
        })
        return
      }

      // Generate digest content
      const memoryCount = recentMemories.length
      const title = `Your ${type} memory digest`
      const message = `You have ${memoryCount} new memor${memoryCount === 1 ? 'y' : 'ies'} from the past ${type === 'daily' ? 'day' : 'week'}.`

      // Queue digest notification
      await this.queueNotification({
        userId,
        type: `digest.${type}`,
        title,
        message,
        metadata: {
          digest_type: type,
          memory_count: memoryCount,
          memories: recentMemories.map(m => ({
            id: m.id,
            title: m.title,
            created_at: m.created_at
          }))
        }
      })

      logger.info('Digest notification generated', {
        metadata: { userId, type, memoryCount }
      })

    } catch (error) {
      logger.error('Failed to generate user digest', error, {
        metadata: { userId, type }
      })
    }
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationSchedulerService()

// Helper functions for common notification types
export const notifications = {
  /**
   * Notify about new memory
   */
  async notifyNewMemory(params: {
    memoryId: string
    memoryTitle: string
    createdBy: string
    branchId?: string
    branchName?: string
    assignedUsers?: string[]
  }): Promise<void> {
    const { assignedUsers = [], ...context } = params
    
    // Notify assigned users
    for (const userId of assignedUsers) {
      if (userId === params.createdBy) continue // Don't notify creator
      
      await notificationScheduler.queueNotification({
        userId,
        type: 'memory.new',
        title: 'New Memory Added',
        message: `A new memory "${params.memoryTitle}" has been added${params.branchName ? ` to ${params.branchName}` : ''}.`,
        contextType: 'memory',
        contextId: params.memoryId,
        metadata: context
      })
    }
  },

  /**
   * Notify about memory assignment
   */
  async notifyMemoryAssignment(params: {
    memoryId: string
    memoryTitle: string
    assignedTo: string
    assignedBy: string
    assignerName: string
  }): Promise<void> {
    await notificationScheduler.queueNotification({
      userId: params.assignedTo,
      type: 'memory.assigned',
      title: 'Memory Assigned',
      message: `${params.assignerName} assigned you a memory: "${params.memoryTitle}".`,
      contextType: 'memory',
      contextId: params.memoryId,
      metadata: {
        memory_title: params.memoryTitle,
        assigned_by: params.assignedBy,
        assigner_name: params.assignerName
      }
    })
  },

  /**
   * Notify about email processing failure
   */
  async notifyEmailProcessingFailed(params: {
    userId: string
    emailSubject: string
    errorMessage: string
    emailId?: string
  }): Promise<void> {
    await notificationScheduler.queueNotification({
      userId: params.userId,
      type: 'email.processing.failed',
      title: 'Email Processing Failed',
      message: `Failed to process email: "${params.emailSubject}". ${params.errorMessage}`,
      contextType: 'email',
      contextId: params.emailId,
      metadata: {
        email_subject: params.emailSubject,
        error_message: params.errorMessage
      }
    })
  },

  /**
   * Notify about email processing success
   */
  async notifyEmailProcessingSuccess(params: {
    userId: string
    emailSubject: string
    memoryId: string
    memoryTitle: string
  }): Promise<void> {
    await notificationScheduler.queueNotification({
      userId: params.userId,
      type: 'email.processing.success',
      title: 'Email Processed Successfully',
      message: `Email "${params.emailSubject}" has been converted to memory: "${params.memoryTitle}".`,
      contextType: 'memory',
      contextId: params.memoryId,
      metadata: {
        email_subject: params.emailSubject,
        memory_title: params.memoryTitle
      }
    })
  },

  /**
   * Notify about branch invitation
   */
  async notifyBranchInvitation(params: {
    invitedUserId: string
    branchId: string
    branchName: string
    inviterName: string
    inviterId: string
  }): Promise<void> {
    await notificationScheduler.queueNotification({
      userId: params.invitedUserId,
      type: 'branch.invitation',
      title: 'Branch Invitation',
      message: `${params.inviterName} invited you to join the branch "${params.branchName}".`,
      contextType: 'branch',
      contextId: params.branchId,
      metadata: {
        branch_name: params.branchName,
        inviter_name: params.inviterName,
        inviter_id: params.inviterId
      }
    })
  },

  /**
   * Notify about tree invitation
   */
  async notifyTreeInvitation(params: {
    invitedUserId: string
    treeId: string
    treeName: string
    inviterName: string
    inviterId: string
  }): Promise<void> {
    await notificationScheduler.queueNotification({
      userId: params.invitedUserId,
      type: 'tree.invitation',
      title: 'Tree Invitation',
      message: `${params.inviterName} invited you to join the family tree "${params.treeName}".`,
      contextType: 'tree',
      contextId: params.treeId,
      metadata: {
        tree_name: params.treeName,
        inviter_name: params.inviterName,
        inviter_id: params.inviterId
      }
    })
  },

  /**
   * Notify about system updates
   */
  async notifySystemUpdate(params: {
    title: string
    message: string
    userIds?: string[]
    metadata?: Record<string, unknown>
  }): Promise<void> {
    // If no specific users, get all users with system update notifications enabled
    let targetUsers = params.userIds
    
    if (!targetUsers) {
      const { data: users, error } = await notificationScheduler.supabase
        .from('user_notification_preferences')
        .select('user_id')
        .or('email_system_updates.eq.true,inapp_system_updates.eq.true')

      if (error) {
        logger.error('Failed to fetch users for system update', error)
        return
      }

      targetUsers = users?.map(u => u.user_id) || []
    }

    // Send to each user
    for (const userId of targetUsers) {
      await notificationScheduler.queueNotification({
        userId,
        type: 'system.update',
        title: params.title,
        message: params.message,
        metadata: params.metadata
      })
    }
  }
}