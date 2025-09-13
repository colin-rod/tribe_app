/**
 * User Data Hooks
 * Custom hooks for user-related data fetching using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { Profile, UserSettings } from '@/types/database'
import { supabase } from '@/lib/supabase/client'
import { getUserBranchPermissions } from '@/lib/rbac'
import toast from 'react-hot-toast'

// Query hooks
export const useUserProfile = (userId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data as Profile
    },
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUserSettings = (userId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.settings(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error
      }
      return data as UserSettings | null
    },
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'current-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    },
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry auth failures
  })
}

// Mutation hooks
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<Profile> }) => {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return updatedProfile as Profile
    },
    onSuccess: (updatedProfile: Profile) => {
      // Update profile cache
      queryClient.setQueryData(queryKeys.users.profile(updatedProfile.id), updatedProfile)
      
      toast.success('Profile updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile')
    },
  })
}

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserSettings> }) => {
      const { data: updatedSettings, error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...data })
        .select()
        .single()
      
      if (error) throw error
      return updatedSettings as UserSettings
    },
    onSuccess: (updatedSettings: UserSettings) => {
      // Update settings cache
      queryClient.setQueryData(queryKeys.users.settings(updatedSettings.user_id), updatedSettings)
      
      toast.success('Settings updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings')
    },
  })
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No user email found')

      // Verify current password by attempting to sign in with it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })
      
      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      return true
    },
    onSuccess: () => {
      toast.success('Password updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update password')
    },
  })
}

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Note: Account deletion should be handled server-side for security
      // This is a placeholder for the actual implementation
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Call your server-side deletion endpoint
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }

      return true
    },
    onSuccess: () => {
      // Clear all caches
      queryClient.clear()
      
      toast.success('Account deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete account')
    },
  })
}