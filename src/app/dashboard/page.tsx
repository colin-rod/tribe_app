'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import DashboardClient from './dashboard-client'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userCircles, setUserCircles] = useState<any[]>([])
  const [trees, setTrees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        console.log('Loading dashboard data...')
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('User check:', { user: !!user, error: !!userError })
        
        if (userError || !user) {
          console.log('No user found, redirecting to login')
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Get user's branches with a simpler approach to avoid recursion
        const { data: userMemberships, error: membershipsError } = await supabase
          .from('branch_members')
          .select('*, branches(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (membershipsError) {
          console.error('Error fetching memberships:', membershipsError)
          console.error('Full error details:', JSON.stringify(membershipsError, null, 2))
        }

        // Transform to the expected format
        const userBranches = userMemberships?.map(membership => ({
          ...membership,
          circles: {
            ...membership.branches,
            circle_members: [] // We'll load this separately if needed
          }
        })) || []

        console.log('Fetched user branches:', userBranches)

        setUserCircles(userBranches || [])

        // Get user's trees (optional)
        const { data: userTrees } = await supabase
          .from('tree_members')
          .select(`
            *,
            trees (*)
          `)
          .eq('user_id', user.id)

        setTrees(userTrees || [])

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setProfile(profile)

        console.log('Dashboard data loaded successfully')
        
      } catch (error) {
        console.error('Error loading dashboard:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

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
      userCircles={userCircles}
      trees={trees}
    />
  )
}