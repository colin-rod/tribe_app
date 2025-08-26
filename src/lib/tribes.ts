import { supabase } from '@/lib/supabase/client'

export async function getUserPrimaryTribe(userId: string): Promise<string | null> {
  try {
    // Get user's primary tribe (where they are owner or first admin/member)
    const { data: tribeMembers, error } = await supabase
      .from('tribe_members')
      .select('tribe_id, role, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })

    if (error || !tribeMembers || tribeMembers.length === 0) {
      return null
    }

    // Prefer owner role, then admin, then member
    const ownerTribe = tribeMembers.find(tm => tm.role === 'owner')
    if (ownerTribe) return ownerTribe.tribe_id

    const adminTribe = tribeMembers.find(tm => tm.role === 'admin')
    if (adminTribe) return adminTribe.tribe_id

    // Return first tribe (by join date)
    return tribeMembers[0].tribe_id

  } catch (error) {
    console.error('Error getting user primary tribe:', error)
    return null
  }
}

export async function getUserTribes(userId: string) {
  try {
    const { data: userTribes, error } = await supabase
      .from('tribe_members')
      .select(`
        *,
        tribes (
          id,
          name,
          description,
          created_by,
          created_at,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching user tribes:', error)
      return []
    }

    return userTribes || []
  } catch (error) {
    console.error('Error getting user tribes:', error)
    return []
  }
}