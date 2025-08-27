import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InviteClient from './invite-client'

export default async function InvitePage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user's trees where they are admin or have permission to invite
  const { data: trees, error: treesError } = await supabase
    .from('trees')
    .select(`
      *,
      tree_members!inner (
        role,
        user_id
      ),
      branches (
        id,
        name,
        color
      )
    `)
    .eq('tree_members.user_id', user.id)
    .in('tree_members.role', ['admin', 'member'])

  if (treesError || !trees || trees.length === 0) {
    redirect('/dashboard')
  }

  return (
    <InviteClient 
      user={user} 
      trees={trees}
    />
  )
}