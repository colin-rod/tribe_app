import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RobustDashboard from './robust-dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  return <RobustDashboard user={user} />
}