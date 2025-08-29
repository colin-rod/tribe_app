'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getUserBranchPermissions } from '@/lib/rbac'
import type { User } from '@supabase/supabase-js'

interface PageProps {
  params: Promise<{ branchId: string }>
}

export default function BranchInvitePage({ params }: PageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [branch, setBranch] = useState<{id: string, name: string, description?: string} | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'viewer'>('member')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  
  // Unwrap the params promise
  const { branchId } = use(params)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Get branch data
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select(`
            id,
            name,
            color,
            privacy,
            tree_id,
            trees (
              id,
              name
            )
          `)
          .eq('id', branchId)
          .single()

        if (branchError || !branchData) {
          console.error('Error loading branch:', branchError)
          router.push('/dashboard')
          return
        }

        // Check if user has permission to invite to this branch using RBAC
        const permissions = await getUserBranchPermissions(user.id, branchId)
        
        if (!permissions.canInviteMembers) {
          router.push('/dashboard')
          return
        }

        setBranch(branchData)

      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [branchId, router])

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !branch || !user) {
      alert('Please fill in all required fields')
      return
    }

    setSending(true)
    setSuccess(false)

    try {
      console.log('Starting invitation process for:', { branchId, email: email.trim(), role, userId: user.id })

      // Check if the email is already a member of this branch
      const { data: existingMember, error: checkError } = await supabase
        .from('branch_members')
        .select('id, status')
        .eq('branch_id', branchId)
        .eq('profiles.email', email.trim())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing member:', checkError)
      }

      if (existingMember && existingMember.status === 'active') {
        alert('This person is already a member of this branch')
        return
      }

      // Check if there's already a pending invitation for this email/branch
      const { data: existingInvite, error: inviteCheckError } = await supabase
        .from('branch_invitations')
        .select('id, status')
        .eq('branch_id', branchId)
        .eq('email', email.trim())
        .eq('status', 'pending')
        .single()

      if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
        console.error('Error checking existing invitation:', inviteCheckError)
      }

      if (existingInvite) {
        alert('There is already a pending invitation for this email to this branch')
        return
      }

      console.log('Creating branch invitation...')
      
      // Create the branch-specific invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('branch_invitations')
        .insert({
          branch_id: branchId,
          invited_by: user.id,
          email: email.trim(),
          role,
          status: 'pending'
        })
        .select()
        .single()

      if (inviteError) {
        console.error('Invitation creation error:', inviteError)
        throw inviteError
      }

      console.log('Invitation created successfully:', invitation)

      // Send email notification (you would implement this with your email service)
      // For MVP, we'll just show success message
      
      setSuccess(true)
      setEmail('')
      
      // Auto redirect after success
      setTimeout(() => {
        router.push(`/branches/${branchId}/edit`)
      }, 2000)

    } catch (error: unknown) {
      console.error('Error sending invitation:', error)
      alert(`Failed to send invitation: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !branch) {
    return null
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
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: branch.color }}
                />
                <h1 className="text-lg font-semibold text-gray-900">
                  Invite to {branch.name}
                </h1>
              </div>
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
              We've sent an invitation to <strong>{email}</strong> to join <strong>{branch.name}</strong>.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you back to branch settings...
            </p>
          </div>
        ) : (
          <form onSubmit={sendInvitation} className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Branch Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-3"
                    style={{ backgroundColor: branch.color }}
                  />
                  <div>
                    <h3 className="font-medium text-blue-900">{branch.name}</h3>
                    <p className="text-sm text-blue-700">in {branch.trees?.name}</p>
                  </div>
                </div>
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
                      <div className="text-sm text-gray-500">Can post, comment, and like in this branch</div>
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
                      <div className="text-sm text-gray-500">Can only view and like posts in this branch</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {email && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Invitation Summary</h4>
                  <p className="text-sm text-blue-800">
                    <strong>{email}</strong> will be invited as a <strong>{role}</strong> to <strong>{branch.name}</strong>.
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
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}