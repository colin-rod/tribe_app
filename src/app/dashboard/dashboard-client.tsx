'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile, TreeWithMembers, BranchPermissions } from '@/types/database'
import { getUserBranchPermissions, getUserCirclePermissions } from '@/lib/rbac'
import { getUserTrees } from '@/lib/trees'

interface DashboardClientProps {
  user: User
  profile: Profile
  userCircles: any[]
  trees: any[]
}

export default function DashboardClient({ user, profile, userCircles, trees }: DashboardClientProps) {
  const [selectedBranch, setSelectedBranch] = useState(userCircles && userCircles.length > 0 ? userCircles[0]?.branches : null)
  // Removed branch filter since we now organize by tree
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [branchPermissions, setBranchPermissions] = useState<BranchPermissions | null>(null)
  const [circlePermissions, setCirclePermissions] = useState<BranchPermissions | null>(null)
  const [realtimeNotifications, setRealtimeNotifications] = useState<any[]>([])
  const router = useRouter()

  // Function to show new post notifications
  const showNewPostNotification = (post: any) => {
    const notification = {
      id: `post-${post.id}`,
      type: 'new_post',
      title: 'New post',
      message: `${post.profiles?.first_name} ${post.profiles?.last_name} shared something new`,
      timestamp: new Date(),
      postId: post.id,
      authorId: post.author_id
    }
    
    setRealtimeNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep last 5
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setRealtimeNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  // Load posts and permissions for selected circle
  useEffect(() => {
    if (selectedBranch) {
      loadPosts()
      loadCirclePermissions()
    }
  }, [selectedBranch])

  // Set up real-time subscriptions for posts
  useEffect(() => {
    if (!selectedBranch) return

    console.log('Setting up real-time subscription for circle:', selectedBranch.id)

    // Subscribe to posts table changes for this circle
    const postsChannel = supabase
      .channel(`posts-${selectedBranch.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `circle_id=eq.${selectedBranch.id}`
        },
        async (payload) => {
          console.log('Real-time posts update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New post created - fetch full post data with relations
            const { data: newPost, error } = await supabase
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
              .eq('id', payload.new.id)
              .single()
            
            if (!error && newPost) {
              setPosts(prevPosts => [newPost, ...prevPosts])
              
              // Show notification if it's not the current user's post
              if (newPost.author_id !== user.id) {
                showNewPostNotification(newPost)
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            // Post updated
            const { data: updatedPost, error } = await supabase
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
              .eq('id', payload.new.id)
              .single()
            
            if (!error && updatedPost) {
              setPosts(prevPosts => prevPosts.map(post => 
                post.id === payload.new.id ? updatedPost : post
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            // Post deleted
            setPosts(prevPosts => prevPosts.filter(post => post.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to comments for posts in this circle
    const commentsChannel = supabase
      .channel(`comments-${selectedBranch.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        async (payload) => {
          console.log('Real-time comments update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New comment added - fetch full comment data with profile
            const { data: newComment, error } = await supabase
              .from('comments')
              .select(`
                *,
                profiles (first_name, last_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single()
            
            if (!error && newComment) {
              // Check if this comment belongs to a post in current circle
              setPosts(prevPosts => prevPosts.map(post => {
                if (post.id === newComment.post_id) {
                  return {
                    ...post,
                    comments: [...(post.comments || []), newComment]
                  }
                }
                return post
              }))
            }
          } else if (payload.eventType === 'DELETE') {
            // Comment deleted
            setPosts(prevPosts => prevPosts.map(post => ({
              ...post,
              comments: post.comments?.filter((comment: any) => comment.id !== payload.old.id) || []
            })))
          }
        }
      )
      .subscribe()

    // Subscribe to likes for posts in this circle  
    const likesChannel = supabase
      .channel(`likes-${selectedBranch.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        (payload) => {
          console.log('Real-time likes update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New like added
            setPosts(prevPosts => prevPosts.map(post => {
              if (post.id === payload.new.post_id) {
                return {
                  ...post,
                  likes: [...(post.likes || []), { user_id: payload.new.user_id }]
                }
              }
              return post
            }))
          } else if (payload.eventType === 'DELETE') {
            // Like removed
            setPosts(prevPosts => prevPosts.map(post => {
              if (post.id === payload.old.post_id) {
                return {
                  ...post,
                  likes: post.likes?.filter((like: any) => like.user_id !== payload.old.user_id) || []
                }
              }
              return post
            }))
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions when component unmounts or circle changes
    return () => {
      console.log('Cleaning up real-time subscriptions')
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(commentsChannel)
      supabase.removeChannel(likesChannel)
    }
  }, [selectedBranch, user.id])

  const loadCirclePermissions = async () => {
    if (!selectedBranch || !user) return
    
    try {
      const permissions = await getUserCirclePermissions(user.id, selectedBranch.id)
      setCirclePermissions(permissions)
    } catch (error) {
      console.error('Error loading circle permissions:', error)
    }
  }

  const loadPosts = async () => {
    if (!selectedBranch) return

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
        .eq('branch_id', selectedBranch.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLikePost = async (postId: string) => {
    try {
      const existingLike = posts.find(p => p.id === postId)?.likes?.find((like: any) => like.user_id === user.id)
      
      if (existingLike) {
        // Unlike the post
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        if (error) throw error
        
        // Update local state
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes.filter((like: any) => like.user_id !== user.id) }
            : post
        ))
      } else {
        // Like the post
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id })
        
        if (error) throw error
        
        // Update local state
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes: [...(post.likes || []), { user_id: user.id }] }
            : post
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      // Update local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    }
  }

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmittingComment(true)
    try {
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          profiles (first_name, last_name, avatar_url)
        `)
        .single()

      if (error) throw error

      // Update local state
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId 
          ? { ...post, comments: [...(post.comments || []), comment] }
          : post
      ))
      
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // No longer need to filter circles since they're organized by tribe

  // Group branches by tree for display
  const branchesByTree = userCircles ? userCircles.reduce((acc, uc) => {
    const treeId = uc.circles.tree_id
    const treeName = trees.find(t => t.tree_id === treeId)?.trees?.name || 'Unknown Tree'
    
    if (!acc[treeId]) {
      acc[treeId] = {
        tree: trees.find(t => t.tree_id === treeId)?.trees || { name: treeName },
        circles: []
      }
    }
    acc[treeId].circles.push(uc)
    return acc
  }, {} as Record<string, { tree: any, circles: any[] }>) : {}

  // Separate community branches (if they don't belong to any tree)
  const communityBranches = userCircles ? userCircles.filter(uc => 
    uc.circles.type === 'community' && !uc.circles.tree_id
  ) : []

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
              {/* User Profile Info with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  {profile?.avatar_url ? (
                    <img
                      className="w-8 h-8 rounded-full object-cover"
                      src={profile.avatar_url}
                      alt={`${profile.first_name} ${profile.last_name}`}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      View Profile
                    </p>
                  </div>
                </button>
              </div>
              
              {/* Navigation Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.push('/trees')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                  title="Manage Tribes"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => router.push('/settings')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Notifications */}
      {realtimeNotifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {realtimeNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in"
              onClick={() => {
                if (notification.postId) {
                  setSelectedPost(notification.postId)
                  // Scroll to post if needed
                  const postElement = document.getElementById(`post-${notification.postId}`)
                  if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth' })
                  }
                }
              }}
            >
              <div className="flex items-center cursor-pointer">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM3 8h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-500">{notification.message}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setRealtimeNotifications(prev => prev.filter(n => n.id !== notification.id))
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Tribes & Circles</h2>
              
              {/* Tribes and their circles */}
              <div className="space-y-6">
                {Object.entries(branchesByTree).map(([treeId, treeData]) => (
                  <div key={treeId} className="space-y-3">
                    {/* Tribe Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {treeData.tree.name}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {treeData.circles.length} circle{treeData.circles.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Circles in this tribe */}
                    <div className="space-y-2 ml-2">
                      {treeData.circles.map((userCircle: any) => (
                        <button
                          key={userCircle.circles.id}
                          onClick={() => setSelectedBranch(userCircle.circles)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedBranch?.id === userCircle.circles.id
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
                                {userCircle.circles.type} • {userCircle.circles.member_count} members
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Community Circles (if any) */}
                {communityBranches.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Community Circles
                      </h3>
                      <span className="text-xs text-gray-400">
                        {communityBranches.length} circle{communityBranches.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="space-y-2 ml-2">
                      {communityBranches.map((userCircle: any) => (
                        <button
                          key={userCircle.circles.id}
                          onClick={() => setSelectedBranch(userCircle.circles)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedBranch?.id === userCircle.circles.id
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
                                {userCircle.circles.type} • {userCircle.circles.member_count} members
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Create Circle Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push('/branches/create')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Circle
                </button>
              </div>

              {/* No circles state */}
              {Object.keys(branchesByTree).length === 0 && communityBranches.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-2">No circles yet</p>
                  <p className="text-gray-400 text-xs mb-4">
                    Create your first circle to start sharing with your tribe!
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedBranch ? (
              <div>
                {/* Circle Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: selectedBranch.color }}
                      />
                      <div>
                        <div className="flex items-center space-x-3">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {selectedBranch.name}
                          </h2>
                          {circlePermissions && circlePermissions.userRole !== 'none' && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              circlePermissions.isOwner 
                                ? 'bg-purple-100 text-purple-700'
                                : circlePermissions.isAdmin
                                ? 'bg-blue-100 text-blue-700' 
                                : circlePermissions.isModerator
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {circlePermissions.userRole}
                            </span>
                          )}
                        </div>
                        {selectedBranch.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedBranch.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => router.push('/branches/create')}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        Create Circle
                      </button>
                      
                      {circlePermissions?.canInviteMembers && (
                        <button
                          onClick={() => router.push('/dashboard/invite')}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Invite Members
                        </button>
                      )}
                      
                      {circlePermissions?.canCreatePosts && selectedBranch && (
                        <button
                          onClick={() => router.push(`/branches/${selectedBranch.id}/post`)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          New Post
                        </button>
                      )}
                      
                      {circlePermissions?.canUpdate && (
                        <button
                          onClick={() => router.push(`/branches/${selectedBranch.id}/edit`)}
                          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Circle Settings
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
                        onClick={() => router.push(`/branches/${selectedBranch.id}/post`)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Create first post
                      </button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-lg shadow scroll-mt-20">
                        {/* Post Header */}
                        <div className="p-6 pb-4">
                          <div className="flex items-center mb-4">
                            <button
                              onClick={() => post.author_id !== user.id ? router.push(`/profile/${post.author_id}`) : router.push('/profile')}
                              className="flex items-center hover:bg-gray-50 rounded-lg p-2 transition-colors -ml-2"
                            >
                              {post.profiles?.avatar_url ? (
                                <img
                                  className="w-10 h-10 rounded-full object-cover"
                                  src={post.profiles.avatar_url}
                                  alt={`${post.profiles.first_name} ${post.profiles.last_name}`}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {post.profiles?.first_name?.[0]}{post.profiles?.last_name?.[0]}
                                  </span>
                                </div>
                              )}
                              <div className="ml-3 text-left">
                                <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                  {post.profiles?.first_name} {post.profiles?.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(post.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </button>
                          </div>
                          
                          {post.content && (
                            <p className="text-gray-900 mb-4">{post.content}</p>
                          )}
                          
                          {post.milestone_type && (
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-4">
                              🎉 {post.milestone_type.replace('_', ' ')}
                            </div>
                          )}

                          {/* Media Display */}
                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="mb-4">
                              {post.media_urls.length === 1 ? (
                                // Single media item - full width
                                <div className="rounded-lg overflow-hidden">
                                  {post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.mov') || post.media_urls[0].includes('.webm') ? (
                                    <video 
                                      src={post.media_urls[0]} 
                                      controls 
                                      className="w-full max-h-96 object-cover"
                                    />
                                  ) : (
                                    <img 
                                      src={post.media_urls[0]} 
                                      alt="Post media" 
                                      className="w-full max-h-96 object-cover"
                                    />
                                  )}
                                </div>
                              ) : (
                                // Multiple media items - grid layout
                                <div className={`grid gap-2 rounded-lg overflow-hidden ${
                                  post.media_urls.length === 2 ? 'grid-cols-2' : 
                                  post.media_urls.length === 3 ? 'grid-cols-3' :
                                  'grid-cols-2'
                                }`}>
                                  {post.media_urls.slice(0, 4).map((url: string, index: number) => (
                                    <div key={index} className="relative">
                                      {url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') ? (
                                        <video 
                                          src={url} 
                                          controls 
                                          className="w-full h-32 object-cover"
                                        />
                                      ) : (
                                        <img 
                                          src={url} 
                                          alt={`Post media ${index + 1}`} 
                                          className="w-full h-32 object-cover"
                                        />
                                      )}
                                      {/* Show +X more overlay on last item if there are more than 4 items */}
                                      {index === 3 && post.media_urls.length > 4 && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                          <span className="text-white text-lg font-semibold">
                                            +{post.media_urls.length - 4}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Post Actions */}
                        <div className="px-6 py-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <button 
                                onClick={() => handleLikePost(post.id)}
                                className={`flex items-center space-x-1 transition-colors ${
                                  post.likes?.some((like: any) => like.user_id === user.id) 
                                    ? 'text-red-500' 
                                    : 'text-gray-500 hover:text-red-500'
                                }`}
                              >
                                <svg className="w-5 h-5" fill={
                                  post.likes?.some((like: any) => like.user_id === user.id) ? 'currentColor' : 'none'
                                } stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span className="text-sm">{post.likes?.length || 0}</span>
                              </button>
                              
                              <button 
                                onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span className="text-sm">{post.comments?.length || 0}</span>
                              </button>
                            </div>

                            {/* Post Management Actions */}
                            <div className="flex items-center space-x-2">
                              {/* Edit - only post author or moderators+ */}
                              {(post.author_id === user.id || circlePermissions?.canModerate) && (
                                <button
                                  onClick={() => router.push(`/branches/${selectedBranch.id}/post/${post.id}/edit`)}
                                  className="p-1 text-gray-500 hover:text-blue-500"
                                  title="Edit post"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              
                              {/* Delete - only post author or moderators+ */}
                              {(post.author_id === user.id || circlePermissions?.canModerate) && (
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1 text-gray-500 hover:text-red-500"
                                  title="Delete post"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Comments Section */}
                        {selectedPost === post.id && (
                          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            {/* Existing Comments */}
                            {post.comments && post.comments.length > 0 && (
                              <div className="space-y-3 mb-4">
                                {post.comments.map((comment: any) => (
                                  <div key={comment.id} className="flex space-x-3">
                                    <button
                                      onClick={() => comment.author_id !== user.id ? router.push(`/profile/${comment.author_id}`) : router.push('/profile')}
                                    >
                                      {comment.profiles?.avatar_url ? (
                                        <img
                                          className="w-8 h-8 rounded-full object-cover"
                                          src={comment.profiles.avatar_url}
                                          alt={`${comment.profiles.first_name} ${comment.profiles.last_name}`}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                          <span className="text-xs font-medium text-gray-600">
                                            {comment.profiles?.first_name?.[0]}{comment.profiles?.last_name?.[0]}
                                          </span>
                                        </div>
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <div className="bg-white rounded-lg px-3 py-2">
                                        <button
                                          onClick={() => comment.author_id !== user.id ? router.push(`/profile/${comment.author_id}`) : router.push('/profile')}
                                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                                        >
                                          {comment.profiles?.first_name} {comment.profiles?.last_name}
                                        </button>
                                        <p className="text-sm text-gray-700">{comment.content}</p>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add Comment Form - only if user can create comments */}
                            {circlePermissions?.canRead && (
                              <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                                </span>
                              </div>
                              <div className="flex-1 flex space-x-2">
                                <input
                                  type="text"
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder="Add a comment..."
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={submittingComment}
                                />
                                <button
                                  type="submit"
                                  disabled={!newComment.trim() || submittingComment}
                                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {submittingComment ? 'Posting...' : 'Post'}
                                </button>
                              </div>
                              </form>
                            )}
                          </div>
                        )}
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