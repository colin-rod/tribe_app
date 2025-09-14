'use client'

import type { User } from '@supabase/supabase-js'
import type { Profile, BranchWithDetails } from '@/types/database'
import { TreeWithMembers } from '@/types/common'
import MinimalDashboard from '@/components/dashboard/MinimalDashboard'

interface DashboardClientProps {
  user: User
  profile: Profile
  userBranches: BranchWithDetails[]
  trees: TreeWithMembers[]
}

export default function DashboardClient({ user, profile, userBranches, trees }: DashboardClientProps) {
  return (
    <MinimalDashboard 
      user={user}
      profile={profile}
      userBranches={userBranches}
      trees={trees}
    />
  )
}