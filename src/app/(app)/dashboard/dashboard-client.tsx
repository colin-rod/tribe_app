'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile, Subscription } from '@/types/database'

interface Branch {
  id: string
  name: string
  description?: string
  color: string
  branch_kind: string
  tree_id?: string
  member_count: number
  trees?: {
    id: string
    name: string
  }
}

interface BranchMember {
  id: string
  role: string
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

interface DashboardClientProps {
  user: User
  profile: Profile | null
  userBranches: BranchMember[]
  trees: Tree[]
  subscription: Subscription | null
}

export default function DashboardClient({ user, profile, userBranches, trees, subscription }: DashboardClientProps) {
  const router = useRouter()
  const isPaidUser = subscription?.is_active && subscription?.plan !== 'free'

  return (
    <div className="p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.first_name || user.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your family and branches today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{trees.length}</div>
              <div className="text-sm text-gray-600">Family Trees</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{userBranches.length}</div>
              <div className="text-sm text-gray-600">Your Branches</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
              isPaidUser ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <svg className={`w-6 h-6 ${isPaidUser ? 'text-purple-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {isPaidUser ? 'Pro' : 'Free'}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Branches */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Recent Branches</h2>
                <button
                  onClick={() => router.push('/branches')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            
            {userBranches.length > 0 ? (
              <div className="p-6">
                <div className="space-y-4">
                  {userBranches.map((branchMember) => {
                    const branch = branchMember.branches
                    return (
                      <div key={branch.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-4"
                            style={{ backgroundColor: branch.color }}
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{branch.name}</h3>
                            <div className="flex items-center text-sm text-gray-600">
                              {branch.trees && (
                                <span className="mr-2">{branch.trees.name} •</span>
                              )}
                              <span>{branch.member_count} members</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => router.push(`/branches/${branch.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Branches Yet</h3>
                <p className="text-gray-600 mb-4">Create your first branch to start sharing with family!</p>
                <button
                  onClick={() => router.push('/branches/create')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Create Branch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/branches/create')}
                className="w-full flex items-center p-3 text-left bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Branch
              </button>
              
              <button
                onClick={() => router.push('/trees')}
                className="w-full flex items-center p-3 text-left bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
                Manage Trees
              </button>
              
              {isPaidUser ? (
                <button
                  onClick={() => router.push('/assistant')}
                  className="w-full flex items-center p-3 text-left bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Ask Assistant
                </button>
              ) : (
                <button
                  onClick={() => router.push('/settings?tab=billing')}
                  className="w-full flex items-center p-3 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Unlock Assistant
                </button>
              )}
            </div>
          </div>

          {/* Trees Overview */}
          {trees.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Trees</h3>
                <button
                  onClick={() => router.push('/trees')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Manage
                </button>
              </div>
              <div className="space-y-3">
                {trees.slice(0, 3).map((tree) => (
                  <div key={tree.tree_id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">{tree.trees.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{tree.role}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/trees/${tree.tree_id}/household`)}
                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                    >
                      View
                    </button>
                  </div>
                ))}
                {trees.length > 3 && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => router.push('/trees')}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      +{trees.length - 3} more trees
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upgrade Banner for Free Users */}
          {!isPaidUser && (
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="font-semibold">Upgrade to Pro</h3>
              </div>
              <p className="text-sm text-purple-100 mb-4">
                Unlock the AI assistant, unlimited children, and more features to enhance your family experience.
              </p>
              <button
                onClick={() => router.push('/settings?tab=billing')}
                className="w-full bg-white text-purple-600 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Learn More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}