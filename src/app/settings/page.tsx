'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile, FamilyRole } from '@/types/database'
import {
  ProfileSettings,
  PrivacySettings,
  NotificationSettings,
  AccountSettings
} from '@/components/settings'
import { createComponentLogger } from '@/lib/logger'
import { Icon } from '@/components/ui/IconLibrary'

const logger = createComponentLogger('SettingsPage')

type SettingsTab = 'profile' | 'privacy' | 'notifications' | 'account'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          logger.error('Error loading profile', profileError, { userId: user.id })
          return
        }

        setProfile(profile)

      } catch (error) {
        logger.error('Error loading user data', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const uploadAvatar = async (avatarFile: File): Promise<string | null> => {
    if (!user) return null

    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      logger.error('Error uploading avatar', error, { metadata: { file: avatarFile.name, fileSize: avatarFile.size } })
      throw error
    }
  }

  const handleSaveProfile = async (data: {
    firstName: string
    lastName: string
    bio: string
    familyRole: string
    avatarFile: File | null
  }) => {
    if (!user || !profile) return

    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url

      // Upload new avatar if provided
      if (data.avatarFile) {
        try {
          avatarUrl = await uploadAvatar(data.avatarFile)
        } catch (error) {
          showMessage('error', 'Failed to upload avatar')
          return
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          bio: data.bio,
          family_role: data.familyRole || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      // Update local state
      setProfile({
        ...profile,
        first_name: data.firstName,
        last_name: data.lastName,
        bio: data.bio,
        family_role: (data.familyRole || null) as FamilyRole | null,
        avatar_url: avatarUrl,
      })

      showMessage('success', 'Profile updated successfully!')
      
    } catch (error: unknown) {
      logger.error('Error updating profile', error, { metadata: { userId: user?.id, profileData: data } })
      showMessage('error', (error instanceof Error ? error.message : 'Unknown error') || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!user) return

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }

      showMessage('success', 'Password changed successfully!')
    } catch (error: unknown) {
      logger.error('Error changing password', error, { userId: user?.id })
      throw new Error((error instanceof Error ? error.message : 'Unknown error') || 'Failed to change password')
    }
  }

  const handleDeleteAccount = async () => {
    // This would be implemented when account deletion is ready
    showMessage('error', 'Account deletion is not yet available. Contact support if you need to delete your account.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to load settings</h1>
          <p className="text-gray-600 mb-4">Please try again or contact support if the problem persists.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: 'user' },
    { id: 'privacy' as const, name: 'Privacy', icon: 'lock' },
    { id: 'notifications' as const, name: 'Notifications', icon: 'bell' },
    { id: 'account' as const, name: 'Account', icon: 'settings' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/profile')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon name={tab.icon as any} size="sm" className="mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'profile' && (
            <ProfileSettings
              profile={profile}
              onSave={handleSaveProfile}
              saving={saving}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacySettings />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}

          {activeTab === 'account' && (
            <AccountSettings
              user={user}
              onPasswordChange={handlePasswordChange}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </div>
      </div>
    </div>
  )
}