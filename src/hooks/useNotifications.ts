import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createComponentLogger } from '@/lib/logger'
import type { 
  UserNotificationPreferences, 
  InAppNotification,
  NotificationPreferencesForm 
} from '@/types/database'

const logger = createComponentLogger('useNotifications')

// Hook for managing notification preferences
export function useNotificationPreferences() {
  const queryClient = useQueryClient()

  // Fetch notification preferences
  const {
    data: preferences,
    isLoading,
    error,
    refetch
  } = useQuery<UserNotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/preferences')
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences')
      }
      const result = await response.json()
      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })

  // Update notification preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferencesForm>) => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update notification preferences')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // Update the cache with new preferences
      queryClient.setQueryData(['notification-preferences'], data.data)
      logger.info('Notification preferences updated successfully')
    },
    onError: (error) => {
      logger.error('Failed to update notification preferences', error)
    }
  })

  // Reset preferences to defaults
  const resetPreferencesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/preferences/reset', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reset notification preferences')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // Update the cache with default preferences
      queryClient.setQueryData(['notification-preferences'], data.data)
      logger.info('Notification preferences reset to defaults')
    },
    onError: (error) => {
      logger.error('Failed to reset notification preferences', error)
    }
  })

  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferencesForm>) => {
      updatePreferencesMutation.mutate(updates)
    },
    [updatePreferencesMutation]
  )

  const resetToDefaults = useCallback(() => {
    resetPreferencesMutation.mutate()
  }, [resetPreferencesMutation])

  return {
    preferences,
    isLoading,
    error,
    refetch,
    updatePreferences,
    resetToDefaults,
    isUpdating: updatePreferencesMutation.isPending,
    isResetting: resetPreferencesMutation.isPending,
    updateError: updatePreferencesMutation.error,
    resetError: resetPreferencesMutation.error,
  }
}

// Hook for managing in-app notifications
export function useInAppNotifications(options?: {
  unreadOnly?: boolean
  limit?: number
  autoRefresh?: boolean
}) {
  const {
    unreadOnly = false,
    limit = 20,
    autoRefresh = true
  } = options || {}

  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)

  // Fetch in-app notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inapp-notifications', { unreadOnly, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(unreadOnly && { unread_only: 'true' })
      })
      
      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      return response.json()
    },
    staleTime: autoRefresh ? 30 * 1000 : 5 * 60 * 1000, // 30 seconds if auto-refresh, 5 minutes otherwise
    refetchInterval: autoRefresh ? 60 * 1000 : false, // Refetch every minute if auto-refresh enabled
  })

  const notifications = notificationsData?.data || []
  const unreadCount = notificationsData?.unread_count || 0
  const hasMore = notificationsData?.pagination?.hasMore || false

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark notification as read')
      }
      
      return response.json()
    },
    onSuccess: (_, notificationId) => {
      // Update the notification in the cache
      queryClient.setQueryData(
        ['inapp-notifications', { unreadOnly, limit, offset }],
        (oldData: any) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            data: oldData.data.map((notification: InAppNotification) =>
              notification.id === notificationId
                ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                : notification
            ),
            unread_count: Math.max(0, oldData.unread_count - 1)
          }
        }
      )
      
      logger.info('Notification marked as read', { metadata: { notificationId } })
    },
    onError: (error) => {
      logger.error('Failed to mark notification as read', error)
    }
  })

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark all notifications as read')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['inapp-notifications'] })
      logger.info('All notifications marked as read')
    },
    onError: (error) => {
      logger.error('Failed to mark all notifications as read', error)
    }
  })

  const markAsRead = useCallback(
    (notificationId: string) => {
      markAsReadMutation.mutate(notificationId)
    },
    [markAsReadMutation]
  )

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate()
  }, [markAllAsReadMutation])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setOffset(prev => prev + limit)
    }
  }, [hasMore, isLoading, limit])

  const refresh = useCallback(() => {
    setOffset(0)
    refetch()
  }, [refetch])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    markAsReadError: markAsReadMutation.error,
    markAllAsReadError: markAllAsReadMutation.error,
  }
}

// Hook for notification badge count
export function useNotificationBadge() {
  const { data: notificationsData } = useQuery({
    queryKey: ['notification-badge'],
    queryFn: async () => {
      const response = await fetch('/api/notifications?unread_only=true&limit=1')
      if (!response.ok) {
        throw new Error('Failed to fetch notification count')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })

  return {
    unreadCount: notificationsData?.unread_count || 0,
    hasUnread: (notificationsData?.unread_count || 0) > 0
  }
}