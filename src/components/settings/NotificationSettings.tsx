'use client'

import { useState } from 'react'

interface NotificationSettingsProps {
  // Future: Add user settings prop when notification settings are implemented
}

export default function NotificationSettings({}: NotificationSettingsProps) {
  // These will be connected to actual user settings later
  const [emailNotifications, setEmailNotifications] = useState({
    newPosts: true,
    comments: true,
    reactions: false,
    mentions: true,
    invitations: true,
    weeklyDigest: false,
  })

  const handleEmailToggle = (key: keyof typeof emailNotifications) => {
    setEmailNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
        <p className="text-gray-600">
          Choose how you want to be notified about activity in your family branches.
        </p>
      </div>

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
              <div className="font-medium text-gray-900">New posts</div>
              <div className="text-sm text-gray-600">When someone shares a new memory in your branches</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications.newPosts}
              onChange={() => handleEmailToggle('newPosts')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Comments & replies</div>
              <div className="text-sm text-gray-600">When someone comments on your posts or replies to you</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications.comments}
              onChange={() => handleEmailToggle('comments')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Mentions</div>
              <div className="text-sm text-gray-600">When someone mentions you in a post or comment</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications.mentions}
              onChange={() => handleEmailToggle('mentions')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Branch invitations</div>
              <div className="text-sm text-gray-600">When you're invited to join a family branch</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications.invitations}
              onChange={() => handleEmailToggle('invitations')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Notification Settings Coming Soon
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Notification preferences are currently being developed. You'll receive email notifications 
                for important updates. We'll notify you when these settings become available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button (disabled for now) */}
      <div className="pt-4">
        <button
          type="button"
          disabled
          className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
        >
          Save Notification Settings
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Notification settings will be available in a future update.
        </p>
      </div>
    </div>
  )
}