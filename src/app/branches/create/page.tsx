'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { rbac } from '@/lib/rbac'
import { getUserPrimaryTree, getUserTrees } from '@/lib/trees'
import type { User } from '@supabase/supabase-js'

export default function CreateBranchPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userTrees, setUserTrees] = useState<any[]>([])
  const [primaryTreeId, setPrimaryTreeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // Form state - family branches only
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null)


  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)

      // Get user's trees
      const trees = await getUserTrees(user.id)
      setUserTrees(trees)

      // Get user's primary tree
      const primaryTree = await getUserPrimaryTree(user.id)
      setPrimaryTreeId(primaryTree)
      setSelectedTreeId(primaryTree) // Default to primary tree

      // If user has no trees, redirect to onboarding
      if (!trees.length || !primaryTree) {
        router.push('/onboarding')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !name.trim() || !selectedTreeId) return

    setSubmitting(true)

    try {
      // Create the branch within the selected tree
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .insert({
          tree_id: selectedTreeId, // Required tree association
          name: name.trim(),
          description: description.trim() || null,
          type: 'family',
          privacy: 'private',
          color,
          created_by: user.id
        })
        .select()
        .single()

      if (branchError) throw branchError

      // Assign owner role using RBAC system (branch creator automatically gets owner role)
      const ownerAssigned = await rbac.assignRole(
        user.id,
        'owner',
        { type: 'branch', id: branch.id },
        user.id
      )

      if (!ownerAssigned) {
        throw new Error('Failed to assign owner role')
      }

      // Add creator as member with basic member entry
      const { error: memberError } = await supabase
        .from('branch_members')
        .insert({
          branch_id: branch.id,
          user_id: user.id,
          role: 'owner', // Keep for backward compatibility, but RBAC is source of truth
          join_method: 'admin_added',
          status: 'active'
        })

      if (memberError) throw memberError

      // Redirect to dashboard
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Error creating branch:', error)
      alert(`Failed to create branch: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Create New Branch</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            
            {/* Branch Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">👨‍👩‍👧‍👦</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-900">Creating Private Family Branch</h3>
                  <p className="text-sm text-blue-700">
                    Share family moments and memories with only the people you invite
                  </p>
                </div>
              </div>
            </div>

            {/* Tree Selection */}
            {userTrees.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Tree for this Branch *
                </label>
                <div className="space-y-2">
                  {userTrees.map((treeData) => (
                    <label key={treeData.tree_id} className="flex items-center">
                      <input
                        type="radio"
                        name="tree"
                        value={treeData.tree_id}
                        checked={selectedTreeId === treeData.tree_id}
                        onChange={(e) => setSelectedTreeId(e.target.value)}
                        className="mr-3 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {treeData.trees?.name}
                          {treeData.tree_id === primaryTreeId && (
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        {treeData.trees?.description && (
                          <div className="text-sm text-gray-500">{treeData.trees.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Branch Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Emma's Branch"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share updates and memories about Emma"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Color
                  </label>
                  <div className="flex space-x-2">
                    {colorOptions.map((colorOption) => (
                      <button
                        key={colorOption}
                        type="button"
                        onClick={() => setColor(colorOption)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          color === colorOption ? 'border-gray-400 scale-110' : 'border-gray-200'
                        } transition-all`}
                        style={{ backgroundColor: colorOption }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim() || !selectedTreeId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating Branch...' : 'Create Branch'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}