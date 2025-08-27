import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayoutClient from './layout-client'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  return (
    <AppLayoutClient user={user}>
      {children}
    </AppLayoutClient>
  )
}