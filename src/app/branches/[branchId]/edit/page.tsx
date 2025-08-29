'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { rbac, getUserBranchPermissions, getCrossTreeAccess, createCrossTreeAccess, revokeCrossTreeAccess } from '@/lib/rbac'
import type { User } from '@supabase/supabase-js'
import type { BranchPermissions, CrossTreeAccess, Branch } from '@/types/database'
import { BranchMemberWithProfile, TreeInfo } from '@/types/common'
import {
  BranchGeneralSettings,
  BranchMembersManager,
  BranchPermissionsManager,
  BranchDangerZone
} from '@/components/branches/edit'

interface PageProps {
  params: Promise<{ branchId: string }>
}

export default function BranchEditPage({ params }: PageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [members, setMembers] = useState<BranchMemberWithProfile[]>([])
  const [permissions, setPermissions] = useState<BranchPermissions | null>(null)
  const [crossTreeAccess, setCrossTreeAccess] = useState<CrossTreeAccess[]>([])
  const [availableTrees, setAvailableTrees] = useState<TreeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'permissions' | 'danger'>('general')
  const router = useRouter()
  
  // Unwrap the params promise
  const { branchId } = use(params)

  useEffect(() => {
    const loadBranchData = async () => {
      try {
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Get branch data
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('id', branchId)
          .single()

        if (branchError || !branchData) {
          console.error('Error loading branch:', branchError)
          router.push('/dashboard')
          return
        }

        // Check if user has permission to edit this branch using RBAC
        const userPermissions = await getUserBranchPermissions(user.id, branchId)
        
        if (!userPermissions.canUpdate) {
          router.push('/dashboard')
          return
        }

        setPermissions(userPermissions)
        setBranch(branchData)

        // Load branch members
        const { data: membersData, error: membersError } = await supabase
          .from('branch_members')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            added_at,
            status,
            profiles (
              first_name,
              last_name,
              email,
              avatar_url
            )
          `)
          .eq('branch_id', branchId)
          .order('added_at', { ascending: false })

        if (!membersError && membersData) {
          setMembers(membersData)
        }

        // Load cross-tree access
        const accessData = await getCrossTreeAccess(branchId)
        setCrossTreeAccess(accessData)

        // Load available trees for inviting
        const { data: treesData, error: treesError } = await supabase
          .from('tree_members')
          .select(`
            trees (
              id,
              name,
              description
            )
          `)
          .eq('user_id', user.id)

        if (!treesError && treesData) {
          const trees = treesData
            .map(tm => tm.trees)
            .filter((tree): tree is TreeInfo => tree !== null)
            .map(tree => ({
              id: tree.id,
              name: tree.name,
              description: tree.description
            }))
          setAvailableTrees(trees)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading branch data:', error)
        router.push('/dashboard')
      }
    }

    loadBranchData()
  }, [branchId, router])

  const handleSaveGeneral = async (data: { name: string; description: string; color: string; privacy: 'private' | 'invite_only' }) => {
    if (!branch || !user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: data.name.trim(),
          description: data.description.trim() || null,
          color: data.color,
          privacy: data.privacy,
          updated_at: new Date().toISOString()
        })
        .eq('id', branchId)

      if (error) {
        throw error
      }

      setBranch({
        ...branch,
        name: data.name.trim(),
        description: data.description.trim() || null,
        color: data.color,
        privacy: data.privacy,
      })

      alert('Branch settings updated successfully!')
      
    } catch (error: unknown) {
      console.error('Error updating branch:', error)
      alert(`Failed to update branch: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string, memberUserId: string) => {
    try {
      // Use RBAC to assign the new role
      const roleAssigned = await rbac.assignRole(
        memberUserId,
        newRole as 'owner' | 'admin' | 'moderator' | 'member',
        { type: 'branch', id: branchId },
        user!.id
      )

      if (!roleAssigned) {
        throw new Error('Failed to assign role')
      }

      // Update the member's role in the branch_members table for compatibility
      const { error: memberError } = await supabase
        .from('branch_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (memberError) throw memberError

      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))

      alert('Member role updated successfully!')
      
    } catch (error: unknown) {
      console.error('Error updating member role:', error)
      alert(`Failed to update member role: ${error.message}`)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string, memberUserId: string) => {
    try {
      // Remove from branch_members table
      const { error: memberError } = await supabase
        .from('branch_members')
        .delete()
        .eq('id', memberId)

      if (memberError) throw memberError

      // Remove from RBAC system
      await rbac.removeRole(memberUserId, { type: 'branch', id: branchId })

      // Update local state
      setMembers(prev => prev.filter(member => member.id !== memberId))

      alert(`${memberName} has been removed from the branch.`)
      
    } catch (error: unknown) {
      console.error('Error removing member:', error)
      alert(`Failed to remove member: ${error.message}`)
    }
  }

  const handleInviteTree = async (treeId: string) => {
    try {
      const accessGranted = await createCrossTreeAccess(treeId, branchId, ['read', 'comment'], user!.id)
      
      if (!accessGranted) {
        throw new Error('Failed to grant cross-tree access')
      }

      // Refresh cross-tree access data
      const accessData = await getCrossTreeAccess(branchId)
      setCrossTreeAccess(accessData)

      alert('Tree access granted successfully!')
      
    } catch (error: unknown) {
      console.error('Error granting tree access:', error)
      alert(`Failed to grant access: ${error.message}`)
    }
  }

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const accessRevoked = await revokeCrossTreeAccess(accessId)
      
      if (!accessRevoked) {
        throw new Error('Failed to revoke access')
      }

      // Update local state
      setCrossTreeAccess(prev => prev.filter(access => access.id !== accessId))

      alert('Access revoked successfully!')
      
    } catch (error: unknown) {
      console.error('Error revoking access:', error)
      alert(`Failed to revoke access: ${error.message}`)
    }
  }

  const handleDeleteBranch = async () => {
    if (!branch || !user) return

    try {
      // Delete the branch (this will cascade delete related data)
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId)

      if (error) {
        throw error
      }

      alert('Branch deleted successfully.')
      router.push('/dashboard')
      
    } catch (error: unknown) {
      console.error('Error deleting branch:', error)
      alert(`Failed to delete branch: ${error.message}`)
    }
  }

  const handleInviteMembersClick = () => {
    router.push(`/branches/${branchId}/invite`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!branch || !permissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Branch not found</h1>
          <p className="text-gray-600 mb-4">The branch you're looking for doesn't exist or you don't have permission to edit it.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'general' as const, name: 'General', icon: '⚙️' },
    { id: 'members' as const, name: 'Members', icon: '👥' },
    { id: 'permissions' as const, name: 'Permissions', icon: '🔐' },
    { id: 'danger' as const, name: 'Danger Zone', icon: '⚠️' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Branch: {branch.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'general' && (
            <BranchGeneralSettings
              branch={branch}
              onSave={handleSaveGeneral}
              saving={saving}
            />
          )}

          {activeTab === 'members' && (
            <BranchMembersManager
              members={members}
              permissions={permissions}
              currentUserId={user!.id}
              onRoleChange={handleRoleChange}
              onRemoveMember={handleRemoveMember}
              onInviteClick={handleInviteMembersClick}
            />
          )}

          {activeTab === 'permissions' && (
            <BranchPermissionsManager
              branchId={branchId}
              crossTreeAccess={crossTreeAccess}
              availableTrees={availableTrees}
              onInviteTree={handleInviteTree}
              onRevokeAccess={handleRevokeAccess}
            />
          )}

          {activeTab === 'danger' && (
            <BranchDangerZone
              branch={branch}
              onDelete={handleDeleteBranch}
            />
          )}
        </div>
      </div>
    </div>
  )
}