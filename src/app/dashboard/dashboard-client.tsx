'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile, BranchPermissions } from '@/types/database'
import { getUserBranchPermissions } from '@/lib/rbac'
import ChatContainer from '@/components/chat/ChatContainer'

interface Branch {
  id: string
  name: string
  description?: string
  color: string
}

interface UserBranch {
  branches: Branch
  role: string
  status: string
}

interface Tree {
  id: string
  name: string
  description?: string
}

interface DashboardClientProps {
  user: User
  profile: Profile
  userBranches: UserBranch[]
  trees: Tree[]
}

export default function DashboardClient({ user, profile, userBranches, trees }: DashboardClientProps) {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(
    userBranches && userBranches.length > 0 ? userBranches[0]?.branches : null
  )
  const [branchPermissions, setBranchPermissions] = useState<BranchPermissions | null>(null)
  const router = useRouter()

  // Load branch permissions when branch is selected
  useEffect(() => {
    if (selectedBranch) {
      loadBranchPermissions()
    }
  }, [selectedBranch])

  const loadBranchPermissions = async () => {
    if (!selectedBranch || !user) return
    
    try {
      const permissions = await getUserBranchPermissions(user.id, selectedBranch.id)
      setBranchPermissions(permissions)
    } catch (error) {
      console.error('Error loading branch permissions:', error)
    }
  }

  // Chat interface will handle all post/message interactions

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // No longer need to filter branches since they're organized by tree

  // Group branches by tree for display
  const branchesByTree = userBranches ? userBranches.reduce((acc, uc) => {
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

  // All branches now belong to trees (family branches only)

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Tree</h1>
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
                  title="Manage Trees"
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


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Trees & Branches</h2>
              
              {/* Trees and their branches */}
              <div className="space-y-6">
                {Object.entries(branchesByTree).map(([treeId, treeData]) => (
                  <div key={treeId} className="space-y-3">
                    {/* Tree Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {treeData.tree.name}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {treeData.circles.length} branch{treeData.circles.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    
                    {/* Branches in this tree */}
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
                                {userCircle.circles.member_count} members
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Create Branch Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push('/branches/create')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Branch
                </button>
              </div>

              {/* No branches state */}
              {Object.keys(branchesByTree).length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-2">No branches yet</p>
                  <p className="text-gray-400 text-xs mb-4">
                    Create your first branch to start sharing with your tree!
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3 h-full">
            {selectedBranch ? (
              <div className="bg-white rounded-lg shadow h-full flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: selectedBranch.color }}
                    />
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedBranch.name}
                        </h2>
                        {branchPermissions && branchPermissions.userRole !== 'none' && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            branchPermissions.isOwner 
                              ? 'bg-purple-100 text-purple-700'
                              : branchPermissions.isAdmin
                              ? 'bg-blue-100 text-blue-700' 
                              : branchPermissions.isModerator
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {branchPermissions.userRole}
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
                  
                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    {branchPermissions?.canInviteMembers && (
                      <button
                        onClick={() => router.push('/dashboard/invite')}
                        className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-gray-50"
                        title="Invite Members"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    )}
                    
                    {branchPermissions?.canUpdate && (
                      <button
                        onClick={() => router.push(`/branches/${selectedBranch.id}/edit`)}
                        className="p-2 text-gray-500 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                        title="Branch Settings"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Messages */}
                <ChatContainer 
                  user={user}
                  branch={{
                    id: selectedBranch.id,
                    name: selectedBranch.name,
                    color: selectedBranch.color,
                    description: selectedBranch.description
                  }}
                  canPost={branchPermissions?.canCreatePosts || false}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center h-full flex items-center justify-center">
                <div>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a branch to start chatting</h3>
                  <p className="text-gray-500">Choose a branch from the sidebar to join the conversation.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}