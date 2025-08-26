import { supabase } from '@/lib/supabase/client'

export async function getUserPrimaryTree(userId: string): Promise<string | null> {
  try {
    // Get user's primary tree (where they are owner or first admin/member)
    const { data: treeMembers, error } = await supabase
      .from('tree_members')
      .select('tree_id, role, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })

    if (error || !treeMembers || treeMembers.length === 0) {
      return null
    }

    // Prefer owner role, then admin, then member
    const ownerTree = treeMembers.find(tm => tm.role === 'owner')
    if (ownerTree) return ownerTree.tree_id

    const adminTree = treeMembers.find(tm => tm.role === 'admin')
    if (adminTree) return adminTree.tree_id

    // Return first tree (by join date)
    return treeMembers[0].tree_id

  } catch (error) {
    console.error('Error getting user primary tree:', error)
    return null
  }
}

export async function getUserTrees(userId: string) {
  try {
    const { data: userTrees, error } = await supabase
      .from('tree_members')
      .select(`
        *,
        trees (
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
      console.error('Error fetching user trees:', error)
      return []
    }

    return userTrees || []
  } catch (error) {
    console.error('Error getting user trees:', error)
    return []
  }
}

// Backward compatibility aliases (to be removed after migration)
export const getUserPrimaryTribe = getUserPrimaryTree
export const getUserTribes = getUserTrees