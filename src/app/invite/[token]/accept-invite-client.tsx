'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { BranchInvitation } from '@/types/database'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('AcceptInviteClient')

interface AcceptInviteClientProps {
  invitation: BranchInvitation & { branch_name?: string }
  currentUser: User | null
}

export default function AcceptInviteClient({ invitation, currentUser }: AcceptInviteClientProps) {
  const [step, setStep] = useState<'info' | 'signup' | 'accepting'>('info')
  const [loading, setLoading] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (currentUser && currentUser.email === invitation.email) {
      // User is already signed in with correct email
      setStep('accepting')
      acceptInvitation()
    } else if (currentUser && currentUser.email !== invitation.email) {
      // User is signed in with wrong email
      setError('You need to sign out and sign in with the invited email address.')
    }
  }, [currentUser, invitation.email])

  const acceptInvitation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const user = currentUser
      if (!user) throw new Error('No user found')

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      // Get the tree_id from the branch first
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('tree_id')
        .eq('id', invitation.branch_id)
        .single()

      if (branchError || !branch) throw new Error('Branch not found')

      // Add user to tree
      const { error: memberError } = await supabase
        .from('tree_members')
        .insert({
          tree_id: branch.tree_id,
          user_id: user.id,
          role: invitation.role
        })

      if (memberError) throw memberError

      // For MVP, add user to all branches in the tree
      // In a full implementation, you'd store specific branch selections
      const { data: branches, error: branchesError } = await supabase
        .from('branches')
        .select('id')
        .eq('tree_id', branch.tree_id)

      if (branchesError) throw branchesError

      if (branches && branches.length > 0) {
        const branchMemberInserts = branches.map(branch => ({
          branch_id: branch.id,
          user_id: user.id,
          role: invitation.role
        }))

        const { error: branchMemberError } = await supabase
          .from('branch_members')
          .insert(branchMemberInserts)

        if (branchMemberError) throw branchMemberError
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')

    } catch (error: unknown) {
      logger.error('Error accepting invitation', error, { metadata: { invitationId: invitation.id, userId: currentUser?.id } })
      setError(error instanceof Error ? error.message : 'Unknown error')
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // If email confirmation is required, show message
        if (!data.user.email_confirmed_at) {
          setError('Please check your email and click the confirmation link, then come back to this invitation link.')
        } else {
          // Auto-accept invitation
          setStep('accepting')
          await acceptInvitation()
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    await supabase.auth.signOut()
    router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`)
  }

  if (step === 'accepting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Joining Your Tree</h2>
          <p className="text-gray-600">
            Please wait while we add you to the branch...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Invitation Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">You&apos;re Invited!</h2>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">
              <strong className="text-gray-900">
                Someone
              </strong> has invited you to join
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {invitation.branch_name || 'Branch'}
            </h3>
            {/* Description would be fetched separately */}
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {invitation.role === 'admin' ? 'Admin' : invitation.role === 'member' ? 'Member' : 'Viewer'} Access
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {currentUser && currentUser.email !== invitation.email ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                You&apos;re currently signed in as <strong>{currentUser.email}</strong>, but this invitation is for <strong>{invitation.email}</strong>.
              </p>
              <button
                onClick={handleSignIn}
                className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Sign in as {invitation.email}
              </button>
            </div>
          ) : currentUser && currentUser.email === invitation.email ? (
            <button
              onClick={acceptInvitation}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Accept Invitation'}
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Create an account to join this tree
              </p>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <input
                  type="email"
                  value={invitation.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500"
                />
                
                <input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Accept & Create Account'}
                </button>
              </form>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={handleSignIn}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}