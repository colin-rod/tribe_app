'use client'

import React, { useState, useEffect } from 'react'
import { Branch, BranchMember } from '@/types/database'

interface BranchSelectorProps {
  availableBranches: (Branch & { branch_members: BranchMember[] })[]
  selectedBranchIds: string[]
  onSelectionChange: (branchIds: string[]) => void
  leafId?: string
  mode?: 'create' | 'edit'
  className?: string
}

interface BranchOption extends Branch {
  branch_members: BranchMember[]
  memberCount: number
  isSelected: boolean
}

export default function BranchSelector({
  availableBranches,
  selectedBranchIds,
  onSelectionChange,
  leafId,
  mode = 'create',
  className = ''
}: BranchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([])

  useEffect(() => {
    const options: BranchOption[] = availableBranches.map(branch => ({
      ...branch,
      memberCount: branch.branch_members.length,
      isSelected: selectedBranchIds.includes(branch.id)
    }))

    setBranchOptions(options)
  }, [availableBranches, selectedBranchIds])

  const filteredBranches = branchOptions.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const displayedBranches = showAll ? filteredBranches : filteredBranches.slice(0, 6)

  const handleBranchToggle = (branchId: string) => {
    const updatedIds = selectedBranchIds.includes(branchId)
      ? selectedBranchIds.filter(id => id !== branchId)
      : [...selectedBranchIds, branchId]
    
    onSelectionChange(updatedIds)
  }

  const selectAll = () => {
    onSelectionChange(filteredBranches.map(branch => branch.id))
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const selectedCount = selectedBranchIds.length
  const totalMembers = branchOptions
    .filter(branch => selectedBranchIds.includes(branch.id))
    .reduce((sum, branch) => sum + branch.memberCount, 0)

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Share with Branches' : 'Sharing Settings'}
          </h3>
          <p className="text-sm text-gray-600">
            {selectedCount === 0 
              ? 'Select branches to share this leaf with'
              : `Sharing with ${selectedCount} branch${selectedCount > 1 ? 'es' : ''} (${totalMembers} family members)`
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={selectAll}
            disabled={selectedCount === filteredBranches.length}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={clearAll}
            disabled={selectedCount === 0}
            className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Search */}
      {availableBranches.length > 4 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Branch List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {displayedBranches.map((branch) => (
          <div
            key={branch.id}
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-sm ${
              branch.isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleBranchToggle(branch.id)}
          >
            <div className="flex items-center space-x-3">
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                branch.isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {branch.isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Branch Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: branch.color }}
                  />
                  <h4 className="font-medium text-gray-900">{branch.name}</h4>
                  {branch.privacy === 'private' && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Private
                    </span>
                  )}
                </div>
                {branch.description && (
                  <p className="text-sm text-gray-600 mt-1">{branch.description}</p>
                )}
              </div>
            </div>

            {/* Member Count */}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {branch.memberCount}
              </div>
              <div className="text-xs text-gray-500">
                member{branch.memberCount > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}

        {filteredBranches.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>No branches found matching &quot;{searchTerm}&quot;</p>
          </div>
        )}
      </div>

      {/* Show More/Less */}
      {filteredBranches.length > 6 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAll 
              ? `Show Less` 
              : `Show ${filteredBranches.length - 6} More Branches`
            }
          </button>
        </div>
      )}

      {/* Privacy Notice */}
      {selectedCount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-500 mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Sharing Details</p>
              <p className="mt-1">
                This leaf will be visible to all members of the selected branches. 
                Family members can react and comment based on their branch permissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions for common scenarios */}
      {mode === 'create' && branchOptions.length > 2 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Quick select:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const familyBranches = branchOptions
                  .filter(branch => branch.type === 'family')
                  .map(branch => branch.id)
                onSelectionChange(familyBranches)
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
            >
              👨‍👩‍👧‍👦 All Family
            </button>
            <button
              onClick={() => {
                const closeBranches = branchOptions
                  .filter(branch => branch.memberCount <= 5)
                  .map(branch => branch.id)
                onSelectionChange(closeBranches)
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
            >
              💕 Close Family
            </button>
          </div>
        </div>
      )}
    </div>
  )
}