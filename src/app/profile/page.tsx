'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile, LeafWithDetails } from '@/types/database'
import { BranchWithMembers } from '@/types/common'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('ProfilePage')

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [userBranches, setUserBranches] = useState<BranchWithMembers[]>([])
  const [recentPosts, setRecentPosts] = useState<LeafWithDetails[]>([])
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
          logger.error('Error loading profile', profileError, { userId: user?.id })
          return
        }

        setProfile(profile)

        // Get user's branches
        const { data: branches, error: branchesError } = await supabase
          .from('branch_members')
          .select(`
            branch_id,
            role,
            joined_at,
            status,
            branches (
              id,
              name,
              description,
              type,
              privacy,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })

        if (!branchesError && branches) {
          setUserBranches(branches as unknown as BranchWithMembers[])
        }

        // Get user's recent posts (last 5)
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
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!postsError && posts) {
          setRecentPosts(posts as unknown as LeafWithDetails[])
        }

      } catch (error) {
        logger.error('Error loading profile', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

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

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/profile/manage')}
                className="inline-flex items-center px-4 py-2 bg-leaf-600 text-white text-sm font-medium rounded-lg hover:bg-leaf-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
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
                {profile.avatar_url ? (
                  <Image
                    className="h-20 w-20 rounded-full object-cover"
                    src={profile.avatar_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    width={80}
                    height={80}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-medium">
                    {getInitials(profile.first_name || undefined, profile.last_name || undefined)}
                  </div>
                )}
              </div>
              <div className="ml-6 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-sm text-gray-600 mt-1">{profile.email}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Joined {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Branches */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">My Branches</h2>
              <p className="text-sm text-gray-500">Branches you&apos;re a member of</p>
            </div>
            <div className="p-6">
              {userBranches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  You haven&apos;t joined any branches yet
                </p>
              ) : (
                <div className="space-y-4">
                  {userBranches.map((membership) => (
                    <div
                      key={membership.branch_id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push('/dashboard')}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {membership.branches?.name}
                        </h3>
                        {membership.branches?.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {membership.branches.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {membership.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            Joined {formatDate((membership as { joined_at: string }).joined_at)}
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Posts */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
              <p className="text-sm text-gray-500">Your latest shared memories</p>
            </div>
            <div className="p-6">
              {recentPosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  You haven&apos;t created any posts yet
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
                          {(post as { branches?: { name?: string } }).branches?.name || 'Branch'}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {post.media_urls.length} {post.media_urls.length === 1 ? 'photo' : 'photos'}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="text-center pt-4">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View all posts →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}