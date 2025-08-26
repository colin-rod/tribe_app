'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import CreatePostClient from './create-post-client'
import type { User } from '@supabase/supabase-js'

interface PageProps {
  params: Promise<{ circleId: string }>
}

export default function CreatePostPage({ params }: PageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [circle, setCircle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  // Unwrap the params promise
  const { circleId } = use(params)

  useEffect(() => {
    const checkAuthAndLoadCircle = async () => {
      try {
        console.log('CreatePostPage - checking auth for circle:', circleId)
        
        // Check authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('Auth result:', { user: !!user, error: !!userError })
        
        if (userError || !user) {
          console.log('No user found, redirecting to login')
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Fetch circle data
        const { data: circle, error: circleError } = await supabase
          .from('circles')
          .select('*')
          .eq('id', circleId)
          .single()

        console.log('Circle fetch result:', { circle: !!circle, error: !!circleError })

        if (circleError || !circle) {
          console.log('Circle not found, redirecting to dashboard')
          router.push('/dashboard')
          return
        }

        setCircle(circle)
        
      } catch (error) {
        console.error('Error in checkAuthAndLoadCircle:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadCircle()
  }, [circleId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !circle) {
    return null // Will redirect in useEffect
  }

  return (
    <CreatePostClient 
      user={user} 
      circle={circle}
    />
  )
}