'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { createComponentLogger } from '@/lib/logger'
import { showSuccess, showError } from '@/lib/toast-service'
import ProfileManagement, { type ProfileFormData } from '@/components/profile/ProfileManagement'

const logger = createComponentLogger('ProfileManagePage')

export default function ProfileManagePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
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
          showError('Failed to load profile')
          return
        }

        setProfile(profile)
        setShowModal(true)

      } catch (error) {
        logger.error('Error loading profile', error)
        showError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const uploadAvatar = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Failed to upload avatar: ${uploadError.message}`)
    }

    const { data } = supabase.storage
      .from('user-content')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSave = async (formData: ProfileFormData) => {
    if (!user || !profile) return

    setSaving(true)
    
    try {
      let avatarUrl = profile.avatar_url

      // Upload new avatar if provided
      if (formData.avatarFile) {
        avatarUrl = await uploadAvatar(formData.avatarFile, user.id)
      } else if (formData.avatarFile === null && !formData.currentAvatarUrl) {
        // User removed avatar
        avatarUrl = null
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          family_role: formData.familyRole,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      showSuccess('Profile updated successfully!')
      router.push('/profile')

    } catch (error) {
      logger.error('Error saving profile', error, { userId: user.id })
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile'
      throw new Error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/profile')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-leaf-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-leaf-600 text-white text-sm font-medium rounded-lg hover:bg-leaf-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {showModal && (
          <ProfileManagement
            profile={profile}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  )
}