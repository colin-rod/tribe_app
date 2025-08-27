'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile, Subscription } from '@/types/database'
import Sidebar from '@/components/sidebar'

interface Tree {
  tree_id: string
  role: string
  trees: {
    id: string
    name: string
  }
}

interface AppLayoutClientProps {
  user: User
  children: React.ReactNode
}

export default function AppLayoutClient({ user, children }: AppLayoutClientProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [trees, setTrees] = useState<Tree[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLayoutData = async () => {
      try {
        // Try to load profile
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileData) setProfile(profileData)
        } catch (error) {
          console.log('Could not load profile:', error)
        }

        // Try to load trees
        try {
          const { data: treeData } = await supabase
            .from('tree_members')
            .select(`
              *,
              trees (*)
            `)
            .eq('user_id', user.id)
          
          if (treeData) setTrees(treeData)
        } catch (error) {
          console.log('Could not load trees:', error)
        }

        // Try to load subscription
        try {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (subData) setSubscription(subData)
        } catch (error) {
          console.log('Could not load subscription:', error)
        }

      } catch (error) {
        console.error('Error loading layout data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLayoutData()
  }, [user.id])

  // Don't show loading skeleton - just render immediately with basic data
  // if (loading) {
  //   return (
  //     <div className="flex h-screen bg-gray-50">
  //       {/* Sidebar skeleton */}
  //       <div className="w-64 bg-white border-r border-gray-200">
  //         <div className="p-4">
  //           <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
  //           <div className="h-10 bg-gray-200 rounded animate-pulse mb-6"></div>
  //           <div className="space-y-2">
  //             {[1, 2, 3, 4].map((i) => (
  //               <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
  //             ))}
  //           </div>
  //         </div>
  //       </div>
        
  //       {/* Main content skeleton */}
  //       <main className="flex-1 p-8">
  //         <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
  //         <div className="h-4 bg-gray-200 rounded animate-pulse mb-8 w-1/2"></div>
  //         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  //           <div className="lg:col-span-2">
  //             <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
  //           </div>
  //           <div className="space-y-4">
  //             <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
  //             <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
  //           </div>
  //         </div>
  //       </main>
  //     </div>
  //   )
  // }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={user} 
        profile={profile}
        trees={trees}
        subscription={subscription}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}