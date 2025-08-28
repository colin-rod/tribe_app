'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { rbac, getUserBranchPermissions, getCrossTreeAccess, createCrossTreeAccess, revokeCrossTreeAccess } from '@/lib/rbac'
import type { User } from '@supabase/supabase-js'
import type { BranchPermissions, CrossTreeAccess } from '@/types/database'

interface PageProps {
  params: Promise<{ branchId: string }>
}

export default function BranchEditPage({ params }: PageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [branch, setBranch] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [permissions, setPermissions] = useState<BranchPermissions | null>(null)
  const [crossTreeAccess, setCrossTreeAccess] = useState<CrossTreeAccess[]>([])
  const [availableTrees, setAvailableTrees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'permissions' | 'danger'>('general')
  const router = useRouter()
  
  // Unwrap the params promise
  const { branchId } = use(params)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [privacy, setPrivacy] = useState<'private' | 'invite_only'>('private')

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
        setName(branchData.name)
        setDescription(branchData.description || '')
        setColor(branchData.color || '#3B82F6')
        setPrivacy(branchData.privacy || 'private')

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

        // Load cross-tree access data
        const crossTreeData = await getCrossTreeAccess(branchId)
        setCrossTreeAccess(crossTreeData)

        // Load available trees for cross-tree invitations (exclude current branch's tree)
        const { data: allTrees } = await supabase
          .from('trees')
          .select('id, name, description')
          .neq('id', branchData.tree_id)
          .eq('is_active', true)

        if (allTrees) {
          setAvailableTrees(allTrees)
        }

      } catch (error) {
        console.error('Error loading branch data:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadBranchData()
  }, [branchId, router])

  const handleSaveGeneral = async () => {
    if (!branch || !user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          color,
          privacy,
          updated_at: new Date().toISOString()
        })
        .eq('id', branchId)

      if (error) {
        throw error
      }

      setBranch({
        ...branch,
        name: name.trim(),
        description: description.trim() || null,
        color,
        privacy,
      })

      alert('Branch settings updated successfully!')
      
    } catch (error: any) {
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
        newRole,
        { type: 'branch', id: branchId },
        user!.id
      )

      if (!roleAssigned) {
        throw new Error('Failed to assign role through RBAC')
      }

      // Update branch_members for backward compatibility
      const { error } = await supabase
        .from('branch_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))

      alert('Member role updated successfully!')
    } catch (error: any) {
      console.error('Error updating member role:', error)
      alert(`Failed to update member role: ${error.message}`)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string, memberUserId: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this branch?`)) {
      return
    }

    try {
      // Remove RBAC role assignments for this user in this branch
      await rbac.removeRole(memberUserId, { type: 'branch', id: branchId })

      // Remove from branch_members table
      const { error } = await supabase
        .from('branch_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setMembers(prev => prev.filter(member => member.id !== memberId))
      alert('Member removed successfully!')
    } catch (error: any) {
      console.error('Error removing member:', error)
      alert(`Failed to remove member: ${error.message}`)
    }
  }

  const handleInviteTree = async (treeId: string) => {
    if (!user || !branch) return

    try {
      const success = await createCrossTreeAccess(
        branchId,
        treeId,
        user.id,
        {
          can_read: true,
          can_comment: true,
          can_like: true
        }
      )

      if (success) {
        // Refresh cross-tree access data
        const updatedData = await getCrossTreeAccess(branchId)
        setCrossTreeAccess(updatedData)
        alert('Tree successfully invited to this branch!')
      } else {
        alert('Failed to invite tree')
      }
    } catch (error) {
      console.error('Error inviting tree:', error)
      alert('Failed to invite tree')
    }
  }

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const success = await revokeCrossTreeAccess(accessId)
      
      if (success) {
        // Refresh cross-tree access data
        const updatedData = await getCrossTreeAccess(branchId)
        setCrossTreeAccess(updatedData)
        alert('Tree access revoked successfully!')
      } else {
        alert('Failed to revoke access')
      }
    } catch (error) {
      console.error('Error revoking access:', error)
      alert('Failed to revoke access')
    }
  }

  const handleDeleteBranch = async () => {
    if (!branch || !user) return

    const confirmText = `DELETE ${branch.name}`
    const userInput = prompt(
      `This action cannot be undone. All posts, comments, and member data will be permanently deleted.\n\nTo confirm deletion, type: ${confirmText}`
    )

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert('Deletion cancelled - text did not match')
      }
      return
    }

    setSaving(true)
    try {
      // Delete the branch (cascade will handle related data)
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId)

      if (error) throw error

      alert('Branch deleted successfully')
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Error deleting branch:', error)
      alert(`Failed to delete branch: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading branch settings...</p>
        </div>
      </div>
    )
  }

  if (!user || !branch) {
    return null
  }

  const tabs = [
    { id: 'general' as const, name: 'General', icon: '⚙️' },
    { id: 'members' as const, name: 'Members', icon: '👥' },
    { id: 'permissions' as const, name: 'Cross-Tree', icon: '🔗' },
    { id: 'danger' as const, name: 'Danger Zone', icon: '⚠️' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            
            <div className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: color }}
              />
              <h1 className="text-xl font-semibold text-gray-900">{branch.name} Settings</h1>
            </div>
            
            <div></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-1/4 bg-gray-50 border-r border-gray-200">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {activeTab === 'general' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">General Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Circle Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Circle Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter circle name"
                        maxLength={100}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe what this circle is about..."
                        maxLength={500}
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                        Circle Color
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="color"
                          id="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <div className="flex items-center">
                          <div 
                            className="w-6 h-6 rounded-full mr-2"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm text-gray-600">{color}</span>
                        </div>
                      </div>
                    </div>

                    {/* Privacy */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Privacy Setting
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="private"
                            checked={privacy === 'private'}
                            onChange={(e) => setPrivacy(e.target.value as any)}
                            className="mr-3 text-blue-600"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Private</div>
                            <div className="text-sm text-gray-500">Only members can see this circle</div>
                          </div>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="invite_only"
                            checked={privacy === 'invite_only'}
                            onChange={(e) => setPrivacy(e.target.value as any)}
                            className="mr-3 text-blue-600"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Invite Only</div>
                            <div className="text-sm text-gray-500">Visible but requires invitation to join</div>
                          </div>
                        </label>

                      </div>
                    </div>


                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveGeneral}
                        disabled={saving || !name.trim()}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Members</h2>
                    {permissions?.canInviteMembers && (
                      <button
                        onClick={() => router.push(`/branches/${branchId}/invite`)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Invite Members
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          {member.profiles?.avatar_url ? (
                            <img
                              className="w-10 h-10 rounded-full object-cover mr-3"
                              src={member.profiles.avatar_url}
                              alt={`${member.profiles.first_name} ${member.profiles.last_name}`}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium mr-3">
                              {member.profiles?.first_name?.[0]}{member.profiles?.last_name?.[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.profiles?.first_name} {member.profiles?.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{member.profiles?.email}</p>
                            <p className="text-xs text-gray-400">
                              Joined {new Date(member.joined_at || member.added_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value, member.user_id)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={member.user_id === user.id || !permissions?.canManageMembers} // Can't change own role or if no permission
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          
                          {member.user_id !== user.id && permissions?.canManageMembers && (
                            <button
                              onClick={() => handleRemoveMember(member.id, `${member.profiles?.first_name} ${member.profiles?.last_name}`, member.user_id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove member"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'permissions' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Cross-Tree Access</h2>
                  <p className="text-gray-600 mb-6">
                    Share this branch with other trees (like godparents, close family friends, or extended family).
                  </p>

                  {/* Current Cross-Tree Access */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Trees with Access</h3>
                    {crossTreeAccess.length > 0 ? (
                      <div className="space-y-3">
                        {crossTreeAccess.map((access: any) => (
                          <div key={access.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{access.trees?.name}</h4>
                              {access.trees?.description && (
                                <p className="text-sm text-gray-500">{access.trees.description}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                Invited on {new Date(access.invited_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRevokeAccess(access.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                            >
                              Revoke Access
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No trees currently have access to this branch.</p>
                    )}
                  </div>

                  {/* Invite New Trees */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Trees</h3>
                    {availableTrees.length > 0 ? (
                      <div className="space-y-3">
                        {availableTrees.filter(tree => 
                          !crossTreeAccess.some(access => access.tree_id === tree.id)
                        ).map((tree) => (
                          <div key={tree.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{tree.name}</h4>
                              {tree.description && (
                                <p className="text-sm text-gray-500">{tree.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleInviteTree(tree.id)}
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                            >
                              Invite Tree
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        {availableTrees.length === 0 ? 
                          'No other trees are available to invite.' :
                          'All available trees have already been invited.'
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'danger' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Danger Zone</h2>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-red-800 mb-2">Delete Branch</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Once you delete a branch, there is no going back. All posts, comments, and member data will be permanently deleted.
                    </p>
                    {permissions?.canDelete && (
                      <button
                        onClick={handleDeleteBranch}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                      >
                        Delete This Branch
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}