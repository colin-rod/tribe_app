import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('AuthService')

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

export async function getUserProfile() {
  const supabase = await createClient()
  const user = await getUser()
  
  if (!user) {
    return null
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) {
    logger.error('Failed to fetch user profile', error, { 
      action: 'getUserProfile', 
      metadata: { userId: user.id }
    })
    return null
  }
  
  return profile
}