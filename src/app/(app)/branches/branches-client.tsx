'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile, BranchKind, PrivacyLevel } from '@/types/database'

interface Branch {
  id: string
  name: string
  description?: string
  color: string
  privacy_level: PrivacyLevel
  branch_kind: BranchKind
  tree_id?: string
  member_count: number
  created_at: string
  trees?: {
    id: string
    name: string
  }
}

interface BranchMember {
  id: string
  role: string
  status: string
  joined_at: string
  branches: Branch
}

interface Tree {
  tree_id: string
  role: string
  trees: {
    id: string
    name: string
  }
}

interface BranchesClientProps {
  user: User
  profile: Profile | null
  initialBranches: BranchMember[]
  userTrees: Tree[]
}

export default function BranchesClient({ user, profile, initialBranches, userTrees }: BranchesClientProps) {
  const [branches, setBranches] = useState(initialBranches)
  const [selectedView, setSelectedView] = useState<'all' | 'family' | 'community'>('all')
  const router = useRouter()

  // Filter branches based on selected view
  const filteredBranches = branches.filter(branchMember => {
    const branch = branchMember.branches
    if (selectedView === 'all') return true
    if (selectedView === 'family') return branch.tree_id != null
    if (selectedView === 'community') return branch.tree_id == null
    return true
  })

  // Group branches by tree for family branches
  const branchesByTree = filteredBranches.reduce((acc, branchMember) => {
    const branch = branchMember.branches
    if (branch.tree_id && branch.trees) {
      const treeId = branch.tree_id
      if (!acc[treeId]) {
        acc[treeId] = {
          tree: branch.trees,
          branches: []
        }
      }
      acc[treeId].branches.push(branchMember)
    }
    return acc
  }, {} as Record<string, { tree: any, branches: BranchMember[] }>)

  // Get community branches (no tree_id)
  const communityBranches = filteredBranches.filter(branchMember => !branchMember.branches.tree_id)

  const getBranchIcon = (branchKind: BranchKind) => {
    switch (branchKind) {
      case 'family':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
          </svg>
        )
      case 'community':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const getPrivacyIcon = (privacy: PrivacyLevel) => {
    switch (privacy) {
      case 'public':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'private':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'tree_only':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <p className="text-gray-600 mt-1">
              Your family branches and community groups
            </p>
          </div>
          <button
            onClick={() => router.push('/branches/create')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Branch
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Branches', count: branches.length },
              { key: 'family', label: 'Family Branches', count: branches.filter(b => b.branches.tree_id).length },
              { key: 'community', label: 'Community Branches', count: communityBranches.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedView(tab.key as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  selectedView === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {filteredBranches.length > 0 ? (
        <div className="space-y-8">
          {/* Family Branches (grouped by tree) */}
          {(selectedView === 'all' || selectedView === 'family') && Object.entries(branchesByTree).map(([treeId, treeData]) => (
            <div key={treeId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                    {treeData.tree.name} Family
                  </h2>
                  <span className="text-sm text-green-700">
                    {treeData.branches.length} branch{treeData.branches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {treeData.branches.map((branchMember) => {
                    const branch = branchMember.branches
                    return (
                      <div key={branch.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                              style={{ backgroundColor: branch.color }}
                            />
                            <h3 className="font-medium text-gray-900 truncate">{branch.name}</h3>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-400">
                            {getPrivacyIcon(branch.privacy_level)}
                            {getBranchIcon(branch.branch_kind)}
                          </div>
                        </div>

                        {branch.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {branch.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {branch.member_count} members
                          </div>
                          
                          <button
                            onClick={() => router.push(`/branches/${branch.id}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Community Branches */}
          {(selectedView === 'all' || selectedView === 'community') && communityBranches.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Community Branches
                  </h2>
                  <span className="text-sm text-purple-700">
                    {communityBranches.length} branch{communityBranches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communityBranches.map((branchMember) => {
                    const branch = branchMember.branches
                    return (
                      <div key={branch.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                              style={{ backgroundColor: branch.color }}
                            />
                            <h3 className="font-medium text-gray-900 truncate">{branch.name}</h3>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-400">
                            {getPrivacyIcon(branch.privacy_level)}
                            {getBranchIcon(branch.branch_kind)}
                          </div>
                        </div>

                        {branch.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {branch.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {branch.member_count} members
                          </div>
                          
                          <button
                            onClick={() => router.push(`/branches/${branch.id}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            {selectedView === 'all' && 'No Branches Yet'}
            {selectedView === 'family' && 'No Family Branches'}
            {selectedView === 'community' && 'No Community Branches'}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            {selectedView === 'all' && "Create your first branch to start sharing memories and connecting with family or community members."}
            {selectedView === 'family' && "Create family branches within your trees to organize different aspects of your family life."}
            {selectedView === 'community' && "Join or create community branches to connect with like-minded families and groups."}
          </p>
          <button
            onClick={() => router.push('/branches/create')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Branch
          </button>
        </div>
      )}
    </div>
  )
}