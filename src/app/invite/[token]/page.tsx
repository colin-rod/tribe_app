import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AcceptInviteClient from './accept-invite-client'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()
  
  // Get invitation by token
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select(`
      *,
      trees (
        id,
        name,
        description
      ),
      profiles!invitations_invited_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">
            This invitation link is invalid, expired, or has already been used.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Create Account
          </a>
        </div>
      </div>
    )
  }

  // Check if user is already signed in
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AcceptInviteClient 
      invitation={invitation}
      currentUser={user}
    />
  )
}