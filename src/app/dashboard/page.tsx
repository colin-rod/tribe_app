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
  const [tribes, setTribes] = useState<any[]>([])
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

        // Get user's circles with a simpler approach to avoid recursion
        const { data: userMemberships, error: membershipsError } = await supabase
          .from('circle_members')
          .select('*, circles(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (membershipsError) {
          console.error('Error fetching memberships:', membershipsError)
          console.error('Full error details:', JSON.stringify(membershipsError, null, 2))
        }

        // Transform to the expected format
        const userCircles = userMemberships?.map(membership => ({
          ...membership,
          circles: {
            ...membership.circles,
            circle_members: [] // We'll load this separately if needed
          }
        })) || []

        console.log('Fetched user circles:', userCircles)

        setUserCircles(userCircles || [])

        // Get user's tribes (optional)
        const { data: userTribes } = await supabase
          .from('tribe_members')
          .select(`
            *,
            tribes (*)
          `)
          .eq('user_id', user.id)

        setTribes(userTribes || [])

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
      tribes={tribes}
    />
  )
}