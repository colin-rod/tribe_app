import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TreesClient from './trees-client'
import { getUserTrees } from '@/lib/trees'

export default async function TreesPage() {
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

  // Get user's trees
  const trees = await getUserTrees(user.id)

  return (
    <TreesClient 
      user={user}
      profile={profile}
      initialTrees={trees}
    />
  )
}