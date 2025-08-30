'use client'

import { useState } from 'react'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('InviteClient')
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { TreeWithMembers } from '@/types/common'

interface InviteClientProps {
  user: User
  trees: TreeWithMembers[]
}

export default function InviteClient({ user, trees }: InviteClientProps) {
  const [selectedTree, setSelectedTree] = useState(trees[0]?.id || '')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'viewer'>('member')
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const selectedTreeData = trees.find(t => t.id === selectedTree)

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    )
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !selectedTree) {
      alert('Please fill in all required fields')
      return
    }

    if (selectedBranches.length === 0) {
      alert('Please select at least one branch')
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Create the invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          tree_id: selectedTree,
          invited_by: user.id,
          email: email.trim(),
          role,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Store selected branches in a temporary way (you might want to create a separate table for this)
      // For now, we'll handle branch assignments when the invitation is accepted

      // Send email notification (you would implement this with your email service)
      // For MVP, we'll just show success message
      
      setSuccess(true)
      setEmail('')
      setSelectedBranches([])
      
      // Auto redirect after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: unknown) {
      logger.error('Error sending invitation', error, { email, treeId: selectedTree })
      alert(`Failed to send invitation: ${error.message}`)
    } finally {
      setLoading(false)
    }
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
              <h1 className="text-lg font-semibold text-gray-900">Invite Family Member</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Sent!</h2>
            <p className="text-gray-600 mb-4">
              We've sent an invitation to <strong>{email}</strong> to join your tree.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you back to dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={sendInvitation} className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Tree Selection */}
              <div className="mb-6">
                <label htmlFor="tree" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tree
                </label>
                <select
                  id="tree"
                  value={selectedTree}
                  onChange={(e) => {
                    setSelectedTree(e.target.value)
                    setSelectedBranches([])
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {trees.map((tree) => (
                    <option key={tree.id} value={tree.id}>
                      {tree.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter their email address"
                  required
                />
              </div>

              {/* Role */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Access Level
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="member"
                      checked={role === 'member'}
                      onChange={(e) => setRole(e.target.value as 'member')}
                      className="mr-3 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Member</div>
                      <div className="text-sm text-gray-500">Can post, comment, and like in assigned branches</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="viewer"
                      checked={role === 'viewer'}
                      onChange={(e) => setRole(e.target.value as 'viewer')}
                      className="mr-3 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Viewer</div>
                      <div className="text-sm text-gray-500">Can only view and like posts in assigned branches</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Branch Selection */}
              {selectedTreeData && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Grant Access to Branches
                  </label>
                  <div className="space-y-2">
                    {selectedTreeData.trees?.branches?.map((branch: {id: string, name: string}) => (
                      <label key={branch.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedBranches.includes(branch.id)}
                          onChange={() => handleBranchToggle(branch.id)}
                          className="mr-3 text-blue-600"
                        />
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: branch.color }}
                          />
                          <span className="font-medium text-gray-900">{branch.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedBranches.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      Please select at least one branch
                    </p>
                  )}
                </div>
              )}

              {/* Preview */}
              {email && selectedBranches.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Invitation Summary</h4>
                  <p className="text-sm text-blue-800">
                    <strong>{email}</strong> will be invited as a <strong>{role}</strong> to <strong>{selectedTreeData?.name}</strong> with access to <strong>{selectedBranches.length}</strong> branch{selectedBranches.length !== 1 ? 'es' : ''}.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim() || selectedBranches.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}