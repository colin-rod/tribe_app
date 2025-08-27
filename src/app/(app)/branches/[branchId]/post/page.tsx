'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import CreatePostClient from './create-post-client'
import type { User } from '@supabase/supabase-js'

interface PageProps {
  params: Promise<{ branchId: string }>
}

export default function CreatePostPage({ params }: PageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [branch, setBranch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  // Unwrap the params promise
  const { branchId } = use(params)

  useEffect(() => {
    const checkAuthAndLoadBranch = async () => {
      try {
        console.log('CreatePostPage - checking auth for branch:', branchId)
        
        // Check authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('Auth result:', { user: !!user, error: !!userError })
        
        if (userError || !user) {
          console.log('No user found, redirecting to login')
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Fetch branch data
        const { data: branch, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('id', branchId)
          .single()

        console.log('Branch fetch result:', { branch: !!branch, error: !!branchError })

        if (branchError || !branch) {
          console.log('Branch not found, redirecting to dashboard')
          router.push('/dashboard')
          return
        }

        setBranch(branch)
        
      } catch (error) {
        console.error('Error in checkAuthAndLoadBranch:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoadBranch()
  }, [branchId, router])

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

  if (!user || !branch) {
    return null // Will redirect in useEffect
  }

  return (
    <CreatePostClient 
      user={user} 
      branch={branch}
    />
  )
}