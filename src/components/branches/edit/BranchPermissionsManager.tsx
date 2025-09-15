'use client'

import { useState } from 'react'
import type { CrossTreeAccess } from '@/types/database'
import type { TreeInfo } from '@/types/common'

interface BranchPermissionsManagerProps {
  branchId: string
  crossTreeAccess: CrossTreeAccess[]
  availableTrees: TreeInfo[]
  onInviteTree: (treeId: string) => Promise<void>
  onRevokeAccess: (accessId: string) => Promise<void>
}

export default function BranchPermissionsManager({
  branchId,
  crossTreeAccess,
  availableTrees,
  onInviteTree,
  onRevokeAccess
}: BranchPermissionsManagerProps) {
  const [selectedTreeId, setSelectedTreeId] = useState('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const handleInviteTree = async () => {
    if (!selectedTreeId) return

    setLoading(prev => ({ ...prev, invite: true }))
    try {
      await onInviteTree(selectedTreeId)
      setSelectedTreeId('')
    } finally {
      setLoading(prev => ({ ...prev, invite: false }))
    }
  }

  const handleRevokeAccess = async (accessId: string) => {
    if (!window.confirm('Are you sure you want to revoke access for this tree? Members from that tree will no longer be able to access this branch.')) {
      return
    }

    setLoading(prev => ({ ...prev, [accessId]: true }))
    try {
      await onRevokeAccess(accessId)
    } finally {
      setLoading(prev => ({ ...prev, [accessId]: false }))
    }
  }

  // Filter out trees that already have access
  const availableTreesForInvite = availableTrees.filter(tree => 
    !crossTreeAccess.some(access => access.tree_id === tree.id)
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cross-Tree Access</h2>
        <p className="text-gray-600">
          Grant access to specific trees so their members can participate in this branch.
        </p>
      </div>

      {/* Invite Tree Section */}
      {availableTreesForInvite.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Invite Tree</h3>
          <div className="flex space-x-3">
            <select
              value={selectedTreeId}
              onChange={(e) => setSelectedTreeId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a tree to invite...</option>
              {availableTreesForInvite.map((tree) => (
                <option key={tree.id} value={tree.id}>
                  {tree.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleInviteTree}
              disabled={!selectedTreeId || loading.invite}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading.invite ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </div>
      )}

      {/* Current Access List */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">
          Trees with Access ({crossTreeAccess.length})
        </h3>

        {crossTreeAccess.length > 0 ? (
          <div className="space-y-3">
            {crossTreeAccess.map((access) => (
              <div key={access.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {'Tree ' + access.tree_id}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Granted {new Date(access.invited_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">
                      Permissions: {Array.isArray(access.permissions) ? access.permissions.join(', ') : 'View'}
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(access.id)}
                      disabled={loading[access.id]}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm disabled:opacity-50"
                    >
                      {loading[access.id] ? 'Revoking...' : 'Revoke Access'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-2">🔒</div>
            <div className="font-medium">No cross-tree access granted</div>
            <div className="text-sm mt-1">
              This branch is only accessible to members of its own tree.
            </div>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              About Cross-Tree Access
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                When you grant access to a tree, all members of that tree will be able to see and participate in this branch. 
                You can revoke access at any time, which will immediately remove their ability to access this branch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}