'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface PageProps {
  params: Promise<{ userId: string }>
}

export default function UserProfilePage({ params }: PageProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharedBranches, setSharedBranches] = useState<any[]>([])
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [canViewProfile, setCanViewProfile] = useState(false)
  const router = useRouter()
  
  // Unwrap the params promise
  const { userId } = use(params)

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setCurrentUser(user)

        // Don't allow viewing your own profile this way
        if (user.id === userId) {
          router.push('/profile')
          return
        }

        // Get the profile we want to view
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError || !profile) {
          console.error('Error loading profile:', profileError)
          return
        }

        setUserProfile(profile)

        // Check if current user can view this profile by finding shared branches
        const { data: sharedBranchData, error: sharedError } = await supabase
          .from('branch_members')
          .select(`
            branch_id,
            branches (
              id,
              name,
              description,
              type,
              privacy
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'active')

        if (!sharedError && sharedBranchData) {
          // Find branches that both users are members of
          const { data: currentUserBranches, error: currentUserError } = await supabase
            .from('branch_members')
            .select('branch_id')
            .eq('user_id', user.id)
            .eq('status', 'active')

          if (!currentUserError && currentUserBranches) {
            const currentUserBranchIds = currentUserBranches.map(c => c.branch_id)
            const shared = sharedBranchData.filter(sc => 
              currentUserBranchIds.includes(sc.branch_id)
            )
            
            setSharedBranches(shared)
            setCanViewProfile(shared.length > 0)

            // If they can view the profile, load recent posts from shared branches
            if (shared.length > 0) {
              const sharedBranchIds = shared.map(sc => sc.branch_id)
              
              const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select(`
                  id,
                  content,
                  created_at,
                  media_urls,
                  milestone_type,
                  branches (
                    id,
                    name
                  )
                `)
                .eq('author_id', userId)
                .in('branch_id', sharedBranchIds)
                .order('created_at', { ascending: false })
                .limit(5)

              if (!postsError && posts) {
                setRecentPosts(posts)
              }
            }
          }
        }

      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [userId, router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">This user profile could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!canViewProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-300 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Accessible</h1>
          <p className="text-gray-600 mb-4">
            You can only view profiles of family members you share branches with.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            
            <div className="text-sm text-gray-500">
              Family Member Profile
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {userProfile.avatar_url ? (
                  <img
                    className="h-20 w-20 rounded-full object-cover"
                    src={userProfile.avatar_url}
                    alt={`${userProfile.first_name} ${userProfile.last_name}`}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-medium">
                    {getInitials(userProfile.first_name || undefined, userProfile.last_name || undefined)}
                  </div>
                )}
              </div>
              <div className="ml-6 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {userProfile.first_name} {userProfile.last_name}
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  Family member since {formatDate(userProfile.created_at)}
                </p>
                
                {/* Shared Branches Info */}
                <div className="mt-3">
                  <span className="text-sm text-gray-600">
                    You share {sharedBranches.length} branch{sharedBranches.length !== 1 ? 'es' : ''} together
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shared Branches */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Shared Branches</h2>
              <p className="text-sm text-gray-500">Branches you both belong to</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {sharedBranches.map((sharedBranch) => (
                  <div
                    key={sharedBranch.branch_id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push('/dashboard')}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {sharedBranch.branches.name}
                      </h3>
                      {sharedBranch.branches.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {sharedBranch.branches.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {sharedBranch.branches.type}
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Posts in Shared Branches */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
              <p className="text-sm text-gray-500">Recent activity in shared branches</p>
            </div>
            <div className="p-6">
              {recentPosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No recent posts in shared branches
                </p>
              ) : (
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          {post.circles.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                      
                      {post.milestone_type && (
                        <div className="mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            🎉 {post.milestone_type.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                      
                      {post.content && (
                        <p className="text-gray-900 text-sm mb-2 line-clamp-3">
                          {post.content}
                        </p>
                      )}
                      
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                          </svg>
                          {post.media_urls.length} {post.media_urls.length === 1 ? 'photo' : 'photos'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}