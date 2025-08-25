import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreatePostClient from './create-post-client'

interface PageProps {
  params: { circleId: string }
}

export default async function CreatePostPage({ params }: PageProps) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Verify user has access to this circle
  const { data: circle, error: circleError } = await supabase
    .from('circles')
    .select(`
      *,
      tribe:tribes (*),
      circle_members!inner (
        role,
        user_id
      )
    `)
    .eq('id', params.circleId)
    .eq('circle_members.user_id', user.id)
    .single()

  if (circleError || !circle) {
    redirect('/dashboard')
  }

  return (
    <CreatePostClient 
      user={user} 
      circle={circle}
    />
  )
}