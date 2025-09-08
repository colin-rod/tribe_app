'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { TreeWithMembers, BranchWithMembers } from '@/types/common'
import { useBranchPermissions } from '@/hooks/use-branches'
import TreeExplorer from '@/components/dashboard/TreeExplorer'
import GlobalLeafCreator from '@/components/leaves/GlobalLeafCreator'
import { UnassignedLeavesPanel } from '@/components/leaves/UnassignedLeavesPanel'
import { DragDropLeafAssignment } from '@/components/leaves/DragDropLeafAssignment'
import { AllLeavesView } from '@/components/leaves/AllLeavesView'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('DashboardClient')

interface DashboardClientProps {
  user: User
  profile: Profile
  userBranches: BranchWithMembers[]
  trees: TreeWithMembers[]
}

interface TreeGroup {
  tree: TreeWithMembers['trees']
  branches: BranchWithMembers[]
}

export default function DashboardClient({ user, profile, userBranches, trees }: DashboardClientProps) {
  const [selectedBranch, setSelectedBranch] = useState<BranchWithMembers['branches'] | null>(
    userBranches && userBranches.length > 0 ? userBranches[0]?.branches : null
  )
  const [showGlobalCreator, setShowGlobalCreator] = useState(false)
  const [viewMode, setViewMode] = useState<'branch' | 'all' | 'unassigned'>('branch')
  const [dragDropMode, setDragDropMode] = useState(false)
  const router = useRouter()

  // Use React Query for branch permissions
  useBranchPermissions(
    user.id,
    selectedBranch?.id || '',
    !!selectedBranch?.id
  )

  // Memory explorer will handle all leaf/memory interactions

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // No longer need to filter branches since they're organized by tree

  // Group branches by tree for display
  const branchesByTree = userBranches ? userBranches.reduce((acc, ub) => {
    const treeId = ub.branches?.tree_id
    if (!treeId) return acc
    
    const treeName = trees.find(t => t.tree_id === treeId)?.trees?.name || 'Unknown Tree'
    
    if (!acc[treeId]) {
      acc[treeId] = {
        tree: trees.find(t => t.tree_id === treeId)?.trees || { name: treeName, id: treeId },
        branches: []
      }
    }
    acc[treeId].branches.push(ub)
    return acc
  }, {} as Record<string, TreeGroup>) : {}

  // All branches now belong to trees (family branches only)

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-2">🌳</span>
                Family Trees
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Global Create Leaf Button */}
              <button
                onClick={() => setShowGlobalCreator(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <span className="mr-2">🌿</span>
                Create Leaf
              </button>

              {/* User Profile Info with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  {profile?.avatar_url ? (
                    <Image
                      className="w-8 h-8 rounded-full object-cover"
                      src={profile.avatar_url}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      width={32}
                      height={32}
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
        {/* View Mode Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setViewMode('branch')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'branch' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">🌳</span>
              Branch View
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">🌿</span>
              All Leaves
            </button>
            <button
              onClick={() => setViewMode('unassigned')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'unassigned' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">📥</span>
              Inbox
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {viewMode === 'branch' && selectedBranch && `Viewing: ${selectedBranch.name}`}
              {viewMode === 'all' && 'Showing all your leaves'}
              {viewMode === 'unassigned' && 'Leaves waiting for assignment'}
            </div>
            
            {viewMode === 'unassigned' && (
              <button
                onClick={() => setDragDropMode(!dragDropMode)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  dragDropMode 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                {dragDropMode ? 'List View' : 'Drag & Drop'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
          {/* Quick Actions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setShowGlobalCreator(true)}
                  className="w-full flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span className="mr-3">🌿</span>
                  <div className="text-left">
                    <div className="font-medium">Create Leaf</div>
                    <div className="text-xs opacity-80">Add new content</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setViewMode('all')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                    viewMode === 'all' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">📚</span>
                  <div className="text-left">
                    <div className="font-medium">All Leaves</div>
                    <div className="text-xs text-gray-500">View everything</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setViewMode('unassigned')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                    viewMode === 'unassigned' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">📥</span>
                  <div className="text-left">
                    <div className="font-medium">Inbox</div>
                    <div className="text-xs text-gray-500">Email & unassigned content</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Trees & Branches Navigation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Family Trees & Branches</h2>
              
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
                        {treeData.branches.length} branch{treeData.branches.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    
                    {/* Branches in this tree */}
                    <div className="space-y-2 ml-2">
                      {treeData.branches.map((userBranch: BranchWithMembers) => (
                        <button
                          key={userBranch.branches?.id}
                          onClick={() => setSelectedBranch(userBranch.branches)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedBranch?.id === userBranch.branches?.id
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: userBranch.branches?.color }}
                            />
                            <div>
                              <div className="font-medium text-sm">{userBranch.branches?.name}</div>
                              <div className="text-xs text-gray-500">
                                {userBranch.member_count} members
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
                    Create your first branch to start sharing leaves with your family!
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 h-full">
            <div className="bg-white rounded-lg shadow h-full">
              {viewMode === 'branch' && (
                <TreeExplorer
                  selectedBranch={selectedBranch}
                  trees={trees}
                  userBranches={userBranches}
                  userId={user.id}
                />
              )}
              
              {viewMode === 'all' && (
                <div className="h-full overflow-auto">
                  <div className="p-6">
                    <AllLeavesView 
                      userId={user.id}
                      userBranches={userBranches?.map(ub => ub.branches).filter(Boolean) || []}
                    />
                  </div>
                </div>
              )}
              
              {viewMode === 'unassigned' && (
                <div className="h-full overflow-auto">
                  <div className="p-6">
                    {dragDropMode ? (
                      <DragDropLeafAssignment 
                        userId={user.id}
                        onLeafAssigned={(leafId, branchIds) => {
                          logger.info('Leaf assigned to branches', { leafId, branchIds })
                        }}
                      />
                    ) : (
                      <UnassignedLeavesPanel 
                        userId={user.id}
                        onLeafAssigned={(leafId, branchIds) => {
                          logger.info('Leaf assigned to branches', { leafId, branchIds })
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Global Leaf Creator Modal */}
        {showGlobalCreator && (
          <GlobalLeafCreator
            onSave={() => {
              setShowGlobalCreator(false)
              // Optionally refresh the current view
              if (viewMode === 'unassigned') {
                // Refresh unassigned leaves view
              }
            }}
            onCancel={() => setShowGlobalCreator(false)}
            userBranches={userBranches}
            userId={user.id}
          />
        )}
      </div>
    </div>
  )
}