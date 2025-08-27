import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BranchesClient from './branches-client'

export default async function BranchesPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's branches with tree information
  const { data: userBranches } = await supabase
    .from('branch_members')
    .select(`
      *,
      branches (
        id,
        name,
        description,
        color,
        privacy_level,
        branch_kind,
        tree_id,
        member_count,
        created_at,
        trees (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Get user's trees for creating branches
  const { data: userTrees } = await supabase
    .from('tree_members')
    .select(`
      *,
      trees (*)
    `)
    .eq('user_id', user.id)
    .in('role', ['owner', 'caregiver'])

  return (
    <BranchesClient 
      user={user}
      profile={profile}
      initialBranches={userBranches || []}
      userTrees={userTrees || []}
    />
  )
}