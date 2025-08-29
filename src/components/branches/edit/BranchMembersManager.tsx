'use client'

import { useState } from 'react'
import type { BranchPermissions } from '@/types/database'
import type { BranchMemberWithProfile } from '@/types/common'

interface BranchMembersManagerProps {
  members: BranchMemberWithProfile[]
  permissions: BranchPermissions
  currentUserId: string
  onRoleChange: (memberId: string, newRole: string, memberUserId: string) => Promise<void>
  onRemoveMember: (memberId: string, memberName: string, memberUserId: string) => Promise<void>
  onInviteClick: () => void
}

const roleOptions = [
  { value: 'owner', label: 'Owner', description: 'Full control over the branch' },
  { value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
  { value: 'moderator', label: 'Moderator', description: 'Can moderate content and invite members' },
  { value: 'member', label: 'Member', description: 'Can view and participate in the branch' }
]

export default function BranchMembersManager({
  members,
  permissions,
  currentUserId,
  onRoleChange,
  onRemoveMember,
  onInviteClick
}: BranchMembersManagerProps) {
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({})

  const handleRoleChange = async (memberId: string, newRole: string, memberUserId: string) => {
    setLoadingActions(prev => ({ ...prev, [`role-${memberId}`]: true }))
    try {
      await onRoleChange(memberId, newRole, memberUserId)
    } finally {
      setLoadingActions(prev => ({ ...prev, [`role-${memberId}`]: false }))
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string, memberUserId: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this branch?`)) {
      return
    }

    setLoadingActions(prev => ({ ...prev, [`remove-${memberId}`]: true }))
    try {
      await onRemoveMember(memberId, memberName, memberUserId)
    } finally {
      setLoadingActions(prev => ({ ...prev, [`remove-${memberId}`]: false }))
    }
  }

  const getMemberDisplayName = (member: BranchMemberWithProfile) => {
    const firstName = member.profiles?.first_name || ''
    const lastName = member.profiles?.last_name || ''
    return firstName && lastName ? `${firstName} ${lastName}` : member.profiles?.email || 'Unknown User'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Members</h2>
        {permissions?.canInviteMembers && (
          <button
            onClick={onInviteClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Invite Members
          </button>
        )}
      </div>

      <div className="space-y-4">
        {members.map((member) => (
          <div key={member.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {member.profiles?.avatar_url ? (
                  <img
                    className="w-10 h-10 rounded-full"
                    src={member.profiles.avatar_url}
                    alt={getMemberDisplayName(member)}
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">
                      {member.profiles?.first_name?.[0]}{member.profiles?.last_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {getMemberDisplayName(member)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Role Selector */}
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value, member.user_id)}
                  disabled={member.user_id === currentUserId || !permissions?.canManageMembers}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                {/* Remove Button */}
                {member.user_id !== currentUserId && permissions?.canManageMembers && (
                  <button
                    onClick={() => handleRemoveMember(member.id, getMemberDisplayName(member), member.user_id)}
                    disabled={loadingActions[`remove-${member.id}`]}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm disabled:opacity-50"
                  >
                    {loadingActions[`remove-${member.id}`] ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            </div>

            {/* Role Description */}
            <div className="mt-2 ml-13">
              <div className="text-xs text-gray-500">
                {roleOptions.find(r => r.value === member.role)?.description}
              </div>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No members found.
          </div>
        )}
      </div>
    </div>
  )
}