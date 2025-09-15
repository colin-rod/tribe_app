'use client'

import { useState } from 'react'

export default function PrivacySettings() {
  // These will be connected to actual user settings later
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'family' | 'private'>('family')
  const [showEmail, setShowEmail] = useState(false)
  const [showJoinDate, setShowJoinDate] = useState(true)
  const [allowSearchByEmail, setAllowSearchByEmail] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Visibility</h2>
        <p className="text-gray-600">
          Control who can see your profile and how you appear to others.
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Visibility</h3>
        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={profileVisibility === 'public'}
              onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'family' | 'private')}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Public</div>
              <div className="text-sm text-gray-600">Anyone can view your basic profile information</div>
            </div>
          </label>
          
          <label className="flex items-start">
            <input
              type="radio"
              name="visibility"
              value="family"
              checked={profileVisibility === 'family'}
              onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'family' | 'private')}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Family Only</div>
              <div className="text-sm text-gray-600">Only members of your branches can see your profile</div>
            </div>
          </label>
          
          <label className="flex items-start">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={profileVisibility === 'private'}
              onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'family' | 'private')}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Private</div>
              <div className="text-sm text-gray-600">Only you can see your full profile</div>
            </div>
          </label>
        </div>
      </div>

      {/* Profile Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Show email address</div>
              <div className="text-sm text-gray-600">Allow others to see your email in your profile</div>
            </div>
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Show join date</div>
              <div className="text-sm text-gray-600">Display when you joined the platform</div>
            </div>
            <input
              type="checkbox"
              checked={showJoinDate}
              onChange={(e) => setShowJoinDate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>
        </div>
      </div>

      {/* Search & Discovery */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Search & Discovery</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Allow search by email</div>
              <div className="text-sm text-gray-600">Let others find you by searching for your email address</div>
            </div>
            <input
              type="checkbox"
              checked={allowSearchByEmail}
              onChange={(e) => setAllowSearchByEmail(e.target.checked)}
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
              Privacy Settings Coming Soon
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                These privacy controls are currently being developed. Your profile is currently visible to 
                family members only. We&apos;ll notify you when these settings become available.
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
          Save Privacy Settings
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Privacy settings will be available in a future update.
        </p>
      </div>
    </div>
  )
}