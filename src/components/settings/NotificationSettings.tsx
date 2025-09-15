'use client'

import { useState } from 'react'
import { useNotificationPreferences } from '@/hooks/useNotifications'
import type { NotificationPreferencesForm } from '@/types/common'

interface NotificationSettingsProps {}

export default function NotificationSettings({}: NotificationSettingsProps) {
  const {
    preferences,
    isLoading,
    error,
    updatePreferences,
    resetToDefaults,
    isUpdating,
    isResetting,
    updateError,
    resetError
  } = useNotificationPreferences()

  const [showSuccess, setShowSuccess] = useState(false)

  const handleToggle = (key: keyof NotificationPreferencesForm) => {
    if (!preferences) return
    
    const newValue = !preferences[key]
    updatePreferences({ [key]: newValue })
    
    // Show success message
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleReset = () => {
    resetToDefaults()
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="bg-gray-50 border rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
          <p className="text-gray-600">
            Choose how you want to be notified about activity in your memories and branches.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load notification preferences
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Please try refreshing the page or contact support if the problem persists.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
        <p className="text-gray-600">
          Choose how you want to be notified about activity in your memories and branches.
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                Notification preferences updated successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Error */}
      {updateError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                Failed to update preferences. Please try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Notifications */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email Notifications
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">New memories</div>
              <div className="text-sm text-gray-600">When new memories are added to your trees or branches</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_new_memories ?? true}
              onChange={() => handleToggle('email_new_memories')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Memory assignments</div>
              <div className="text-sm text-gray-600">When memories are assigned to you or your team</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_memory_assignments ?? true}
              onChange={() => handleToggle('email_memory_assignments')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Memory processing</div>
              <div className="text-sm text-gray-600">Updates on email-to-memory conversion status</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_memory_processing ?? true}
              onChange={() => handleToggle('email_memory_processing')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Email processing success</div>
              <div className="text-sm text-gray-600">When emails are successfully converted to memories</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_processing_success ?? false}
              onChange={() => handleToggle('email_processing_success')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Email processing failures</div>
              <div className="text-sm text-gray-600">When email-to-memory conversion fails</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_processing_failed ?? true}
              onChange={() => handleToggle('email_processing_failed')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Branch invitations</div>
              <div className="text-sm text-gray-600">When you&apos;re invited to join a group branch</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_branch_invitations ?? true}
              onChange={() => handleToggle('email_branch_invitations')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Tree invitations</div>
              <div className="text-sm text-gray-600">When you&apos;re invited to join a family tree</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_tree_invitations ?? true}
              onChange={() => handleToggle('email_tree_invitations')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Branch activity</div>
              <div className="text-sm text-gray-600">Summary of activity in your branches</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_branch_activity ?? false}
              onChange={() => handleToggle('email_branch_activity')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">System updates</div>
              <div className="text-sm text-gray-600">Important announcements and feature updates</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_system_updates ?? true}
              onChange={() => handleToggle('email_system_updates')}
              disabled={isUpdating}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {/* Digest Settings */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Email Digests
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Daily digest</div>
              <div className="text-sm text-gray-600">Daily summary of memory activity</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_daily_digest ?? false}
              onChange={() => handleToggle('email_daily_digest')}
              disabled={isUpdating}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Weekly digest</div>
              <div className="text-sm text-gray-600">Weekly summary of memory activity</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_weekly_digest ?? true}
              onChange={() => handleToggle('email_weekly_digest')}
              disabled={isUpdating}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM8.5 14l6-6m-6 0l6 6" />
          </svg>
          In-App Notifications
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">New memories</div>
              <div className="text-sm text-gray-600">Show notifications when new memories are added</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.inapp_new_memories ?? true}
              onChange={() => handleToggle('inapp_new_memories')}
              disabled={isUpdating}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Memory assignments</div>
              <div className="text-sm text-gray-600">Show notifications for memory assignments</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.inapp_memory_assignments ?? true}
              onChange={() => handleToggle('inapp_memory_assignments')}
              disabled={isUpdating}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Branch invitations</div>
              <div className="text-sm text-gray-600">Show notifications for branch invitations</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.inapp_branch_invitations ?? true}
              onChange={() => handleToggle('inapp_branch_invitations')}
              disabled={isUpdating}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Tree invitations</div>
              <div className="text-sm text-gray-600">Show notifications for tree invitations</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.inapp_tree_invitations ?? true}
              onChange={() => handleToggle('inapp_tree_invitations')}
              disabled={isUpdating}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">System updates</div>
              <div className="text-sm text-gray-600">Show notifications for system announcements</div>
            </div>
            <input
              type="checkbox"
              checked={preferences?.inapp_system_updates ?? true}
              onChange={() => handleToggle('inapp_system_updates')}
              disabled={isUpdating}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {/* Reset to Defaults */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Reset Preferences</h3>
            <p className="text-sm text-gray-600">Reset all notification preferences to their default values</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting || isUpdating}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isResetting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting...
              </>
            ) : (
              'Reset to Defaults'
            )}
          </button>
        </div>
        {resetError && (
          <p className="text-sm text-red-600 mt-2">Failed to reset preferences. Please try again.</p>
        )}
      </div>
    </div>
  )
}