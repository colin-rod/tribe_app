'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DashboardClient from './dashboard-client'
import type { User } from '@supabase/supabase-js'
import { useCurrentUser, useUserProfile, useUserTrees, useUserBranches } from '@/hooks'

export default function DashboardPage() {
  const router = useRouter()

  // React Query hooks
  const { data: user, isLoading: userLoading, isError: userError } = useCurrentUser()
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id || '', !!user)
  const { data: treesData, isLoading: treesLoading } = useUserTrees(user?.id || '', !!user)
  const { data: userBranches = [], isLoading: branchesLoading } = useUserBranches(user?.id || '', undefined, !!user)

  const loading = userLoading || profileLoading || treesLoading || branchesLoading
  const trees = treesData?.data || []

  // Redirect to login if no user or error
  useEffect(() => {
    if (userError || (!userLoading && !user)) {
      router.push('/auth/login')
    }
  }, [user, userLoading, userError, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <DashboardClient 
      user={user} 
      profile={profile} 
      userBranches={userBranches}
      trees={trees}
    />
  )
}