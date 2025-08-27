'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface Tree {
  tree_id: string
  role: string
  joined_at: string
  trees: {
    id: string
    name: string
    description?: string
    created_at: string
    member_count?: number
  }
}

interface TreesClientProps {
  user: User
  profile: Profile | null
  initialTrees: Tree[]
}

export default function TreesClient({ user, profile, initialTrees }: TreesClientProps) {
  const [trees, setTrees] = useState(initialTrees)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()

  const handleCreateTree = () => {
    setShowCreateModal(true)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tree</h1>
            <p className="text-gray-600 mt-1">
              Manage your family household, members, and children
            </p>
          </div>
          <button
            onClick={handleCreateTree}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Tree
          </button>
        </div>
      </div>

      {/* Trees Grid */}
      {trees.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {trees.map((treeData) => (
            <div key={treeData.tree_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Tree Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {treeData.trees.name}
                    </h2>
                    {treeData.trees.description && (
                      <p className="text-gray-600 mt-1">
                        {treeData.trees.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      treeData.role === 'owner' 
                        ? 'bg-blue-100 text-blue-800' 
                        : treeData.role === 'caregiver'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {treeData.role === 'owner' ? '👑 Owner' : `🤝 ${treeData.role}`}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Since {new Date(treeData.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tree Stats */}
              <div className="px-6 py-4 bg-white border-b border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-blue-600">
                      {treeData.trees.member_count || 1}
                    </div>
                    <div className="text-xs text-gray-500">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-green-600">0</div>
                    <div className="text-xs text-gray-500">Children</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-purple-600">0</div>
                    <div className="text-xs text-gray-500">Branches</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Household Settings */}
                  {(treeData.role === 'owner' || treeData.role === 'caregiver') && (
                    <button
                      onClick={() => router.push(`/trees/${treeData.tree_id}/household`)}
                      className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                      </svg>
                      Household
                    </button>
                  )}

                  {/* Tree Members */}
                  <button
                    onClick={() => router.push(`/trees/${treeData.tree_id}/members`)}
                    className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Members
                  </button>

                  {/* Children Management */}
                  {(treeData.role === 'owner' || treeData.role === 'caregiver') && (
                    <button
                      onClick={() => router.push(`/trees/${treeData.tree_id}/children`)}
                      className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Children
                    </button>
                  )}

                  {/* Tree Settings */}
                  {(treeData.role === 'owner') && (
                    <button
                      onClick={() => router.push(`/trees/${treeData.tree_id}/settings`)}
                      className="flex items-center justify-center px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Create Your Family Tree</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Start by creating your family tree to organize your household, manage children, and invite other family members.
          </p>
          <button
            onClick={handleCreateTree}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Tree
          </button>
        </div>
      )}

      {/* Quick Actions */}
      {trees.length > 0 && (
        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/assistant')}
              className="flex items-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Ask Assistant</div>
                <div className="text-sm text-blue-600">Get parenting advice</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/branches')}
              className="flex items-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div className="text-left">
                <div className="font-medium">View Branches</div>
                <div className="text-sm text-purple-600">Share with family</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/invite')}
              className="flex items-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Invite Members</div>
                <div className="text-sm text-green-600">Add family members</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Create Tree Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Tree</h3>
            <p className="text-gray-600 mb-6">
              Creating a new tree will take you through the setup process to configure your family household.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  router.push('/onboarding')
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700"
              >
                Continue Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}