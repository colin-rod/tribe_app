import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteClient from './invite-client'

export default async function InvitePage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user's tribes where they are admin or have permission to invite
  const { data: tribes, error: tribesError } = await supabase
    .from('tribes')
    .select(`
      *,
      tribe_members!inner (
        role,
        user_id
      ),
      circles (
        id,
        name,
        color
      )
    `)
    .eq('tribe_members.user_id', user.id)
    .in('tribe_members.role', ['admin', 'member'])

  if (tribesError || !tribes || tribes.length === 0) {
    redirect('/dashboard')
  }

  return (
    <InviteClient 
      user={user} 
      tribes={tribes}
    />
  )
}