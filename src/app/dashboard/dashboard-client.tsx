'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile, TribeWithMembers } from '@/types/database'

interface DashboardClientProps {
  user: User
  profile: Profile
  userCircles: any[]
  tribes: any[]
}

export default function DashboardClient({ user, profile, userCircles, tribes }: DashboardClientProps) {
  const [selectedCircle, setSelectedCircle] = useState(userCircles && userCircles.length > 0 ? userCircles[0]?.circles : null)
  const [circleFilter, setCircleFilter] = useState<'all' | 'family' | 'community'>('all')
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Load posts for selected circle
  useEffect(() => {
    if (selectedCircle) {
      loadPosts()
    }
  }, [selectedCircle])

  const loadPosts = async () => {
    if (!selectedCircle) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (first_name, last_name, avatar_url),
          comments (
            *,
            profiles (first_name, last_name, avatar_url)
          ),
          likes (user_id)
        `)
        .eq('circle_id', selectedCircle.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Filter circles based on selected filter
  const filteredCircles = userCircles ? userCircles.filter(uc => {
    if (circleFilter === 'all') return true
    return uc.circles.type === circleFilter
  }) : []

  // Group circles by type for display
  const familyCircles = userCircles ? userCircles.filter(uc => uc.circles.type === 'family') : []
  const communityCircles = userCircles ? userCircles.filter(uc => uc.circles.type === 'community') : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Tribe</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile?.first_name} {profile?.last_name}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Circles</h2>
              
              {/* Circle Type Filter */}
              <div className="flex space-x-1 mb-4 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setCircleFilter('all')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                    circleFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCircleFilter('family')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                    circleFilter === 'family'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Family
                </button>
                <button
                  onClick={() => setCircleFilter('community')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                    circleFilter === 'community'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Community
                </button>
              </div>

              {/* Family Circles Section */}
              {(circleFilter === 'all' || circleFilter === 'family') && familyCircles.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    👨‍👩‍👧‍👦 Family Circles
                  </h3>
                  <div className="space-y-2">
                    {familyCircles.map((userCircle) => (
                      <button
                        key={userCircle.circles.id}
                        onClick={() => setSelectedCircle(userCircle.circles)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedCircle?.id === userCircle.circles.id
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: userCircle.circles.color }}
                          />
                          <div>
                            <div className="font-medium text-sm">{userCircle.circles.name}</div>
                            <div className="text-xs text-gray-500">
                              {userCircle.circles.member_count} members
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Circles Section */}
              {(circleFilter === 'all' || circleFilter === 'community') && communityCircles.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    🌍 Community Circles
                  </h3>
                  <div className="space-y-2">
                    {communityCircles.map((userCircle) => (
                      <button
                        key={userCircle.circles.id}
                        onClick={() => setSelectedCircle(userCircle.circles)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedCircle?.id === userCircle.circles.id
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: userCircle.circles.color }}
                          />
                          <div>
                            <div className="font-medium text-sm">{userCircle.circles.name}</div>
                            <div className="text-xs text-gray-500">
                              {userCircle.circles.privacy} • {userCircle.circles.member_count} members
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredCircles.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-2">
                    {circleFilter === 'all' ? 'No circles yet' : `No ${circleFilter} circles`}
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    Create your first circle to start sharing!
                  </p>
                  <button
                    onClick={() => router.push('/circles/create')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Circle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCircle ? (
              <div>
                {/* Circle Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: selectedCircle.color }}
                      />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedCircle.name}
                        </h2>
                        {selectedCircle.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedCircle.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => router.push('/circles/create')}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        Create Circle
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/invite')}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Invite
                      </button>
                      {selectedCircle && (
                        <button
                          onClick={() => router.push(`/circles/${selectedCircle.id}/post`)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          New Post
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-6">
                  {loading ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading posts...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                      <p className="text-gray-500 mb-4">Start sharing memories with your circle!</p>
                      <button
                        onClick={() => router.push(`/circles/${selectedCircle.id}/post`)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Create first post
                      </button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className="bg-white rounded-lg shadow">
                        {/* Post Header */}
                        <div className="p-6 pb-4">
                          <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {post.profiles?.first_name?.[0]}{post.profiles?.last_name?.[0]}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {post.profiles?.first_name} {post.profiles?.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {post.content && (
                            <p className="text-gray-900 mb-4">{post.content}</p>
                          )}
                          
                          {post.milestone_type && (
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-4">
                              🎉 {post.milestone_type.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                        
                        {/* Post Actions */}
                        <div className="px-6 py-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span className="text-sm">{post.likes?.length || 0}</span>
                              </button>
                              
                              <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span className="text-sm">{post.comments?.length || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a circle</h3>
                <p className="text-gray-500">Choose a circle from the sidebar to view posts and memories.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}