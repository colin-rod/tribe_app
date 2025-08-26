'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getUserTrees } from '@/lib/trees'
import type { User } from '@supabase/supabase-js'

export default function TreesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [trees, setTrees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Get user's trees
        const userTrees = await getUserTrees(user.id)
        setTrees(userTrees)

      } catch (error) {
        console.error('Error loading trees:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trees...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Your Trees</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600">
            Manage your family trees and their settings. Each tree is your family's home base for organizing branches.
          </p>
        </div>

        {/* Trees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trees.map((treeData) => (
            <div key={treeData.tree_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {treeData.trees.name}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  treeData.role === 'owner' 
                    ? 'bg-blue-100 text-blue-800' 
                    : treeData.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {treeData.role}
                </span>
              </div>

              {treeData.trees.description && (
                <p className="text-gray-600 text-sm mb-4">
                  {treeData.trees.description}
                </p>
              )}

              <div className="text-xs text-gray-500 mb-4">
                Created {new Date(treeData.trees.created_at).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {treeData.role === 'owner' ? 'You own this tree' : 'Member since ' + new Date(treeData.joined_at).toLocaleDateString()}
                </div>
                
                {(treeData.role === 'owner' || treeData.role === 'admin') && (
                  <button
                    onClick={() => router.push(`/trees/${treeData.tree_id}/settings`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {trees.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Trees Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't joined any trees yet. Create your first tree to get started!
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Create Your First Tree
            </button>
          </div>
        )}
      </div>
    </div>
  )
}