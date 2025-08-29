'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { TreeWithMembers } from '@/types/common'

interface InviteClientProps {
  user: User
  tribes: TreeWithMembers[]
}

export default function InviteClient({ user, tribes }: InviteClientProps) {
  const [selectedTribe, setSelectedTribe] = useState(tribes[0]?.id || '')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'viewer'>('member')
  const [selectedCircles, setSelectedCircles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const selectedTribeData = tribes.find(t => t.id === selectedTribe)

  const handleCircleToggle = (circleId: string) => {
    setSelectedCircles(prev => 
      prev.includes(circleId) 
        ? prev.filter(id => id !== circleId)
        : [...prev, circleId]
    )
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !selectedTribe) {
      alert('Please fill in all required fields')
      return
    }

    if (selectedCircles.length === 0) {
      alert('Please select at least one circle')
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Create the invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          tribe_id: selectedTribe,
          invited_by: user.id,
          email: email.trim(),
          role,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Store selected circles in a temporary way (you might want to create a separate table for this)
      // For now, we'll handle circle assignments when the invitation is accepted

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
      console.error('Error sending invitation:', error)
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
              We've sent an invitation to <strong>{email}</strong> to join your tribe.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you back to dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={sendInvitation} className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Tribe Selection */}
              <div className="mb-6">
                <label htmlFor="tribe" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tribe
                </label>
                <select
                  id="tribe"
                  value={selectedTribe}
                  onChange={(e) => {
                    setSelectedTribe(e.target.value)
                    setSelectedBranches([])
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {tribes.map((tribe) => (
                    <option key={tribe.id} value={tribe.id}>
                      {tribe.name}
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
                      <div className="text-sm text-gray-500">Can post, comment, and like in assigned circles</div>
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
                      <div className="text-sm text-gray-500">Can only view and like posts in assigned circles</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Circle Selection */}
              {selectedTribeData && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Grant Access to Circles
                  </label>
                  <div className="space-y-2">
                    {selectedTribeData.circles.map((circle: {id: string, name: string}) => (
                      <label key={circle.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedCircles.includes(circle.id)}
                          onChange={() => handleCircleToggle(circle.id)}
                          className="mr-3 text-blue-600"
                        />
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: circle.color }}
                          />
                          <span className="font-medium text-gray-900">{circle.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedCircles.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      Please select at least one circle
                    </p>
                  )}
                </div>
              )}

              {/* Preview */}
              {email && selectedCircles.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Invitation Summary</h4>
                  <p className="text-sm text-blue-800">
                    <strong>{email}</strong> will be invited as a <strong>{role}</strong> to <strong>{selectedTribeData?.name}</strong> with access to <strong>{selectedCircles.length}</strong> circle{selectedCircles.length !== 1 ? 's' : ''}.
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
                  disabled={loading || !email.trim() || selectedCircles.length === 0}
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