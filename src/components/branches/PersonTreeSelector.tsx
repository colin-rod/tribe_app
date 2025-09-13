'use client'

import { useState } from 'react'

interface TreeData {
  tree_id: string
  role: string
  trees: {
    id: string
    name: string
    person_name: string
    person_birth_date?: string
    description?: string
  } | null
}

interface PersonTreeSelectorProps {
  userTrees: TreeData[]
  primaryTreeId: string | null
  selectedTreeIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  disabled?: boolean
}

export function PersonTreeSelector({
  userTrees,
  primaryTreeId,
  selectedTreeIds,
  onSelectionChange,
  disabled = false
}: PersonTreeSelectorProps) {
  const handleTreeToggle = (treeId: string) => {
    if (disabled) return
    
    const isSelected = selectedTreeIds.includes(treeId)
    let newSelection: string[]
    
    if (isSelected) {
      // Remove from selection
      newSelection = selectedTreeIds.filter(id => id !== treeId)
    } else {
      // Add to selection
      newSelection = [...selectedTreeIds, treeId]
    }
    
    onSelectionChange(newSelection)
  }

  const formatPersonAge = (birthDate?: string) => {
    if (!birthDate) return ''
    
    const birth = new Date(birthDate)
    const now = new Date()
    const ageInMonths = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    
    if (ageInMonths < 12) {
      return `${Math.floor(ageInMonths)}mo`
    } else {
      const years = Math.floor(ageInMonths / 12)
      return `${years}yo`
    }
  }

  const getBranchTypeInfo = () => {
    if (selectedTreeIds.length === 0) {
      return {
        icon: '🤷',
        title: 'Select People',
        description: 'Choose who this branch is for'
      }
    } else if (selectedTreeIds.length === 1) {
      const selectedTree = userTrees.find(t => t.tree_id === selectedTreeIds[0])
      const personName = selectedTree?.trees?.person_name || selectedTree?.trees?.name || 'Unknown'
      return {
        icon: '👤',
        title: `${personName}'s Branch`,
        description: 'Personal branch for one person'
      }
    } else {
      return {
        icon: '👨‍👩‍👧‍👦',
        title: 'Family Branch',
        description: `Shared branch connecting ${selectedTreeIds.length} people`
      }
    }
  }

  const branchInfo = getBranchTypeInfo()

  return (
    <div className="space-y-4">
      {/* Branch Type Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <span className="text-xl">{branchInfo.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900">{branchInfo.title}</h3>
            <p className="text-sm text-blue-700">{branchInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Person Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select People for this Branch *
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {userTrees.map((treeData) => {
            const isSelected = selectedTreeIds.includes(treeData.tree_id)
            const tree = treeData.trees
            const personName = tree?.person_name || tree?.name || 'Unknown Person'
            const age = formatPersonAge(tree?.person_birth_date)
            
            return (
              <label 
                key={treeData.tree_id} 
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleTreeToggle(treeData.tree_id)}
                  disabled={disabled}
                  className="mr-3 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">
                      {personName}
                      {age && (
                        <span className="ml-2 text-sm text-gray-500">({age})</span>
                      )}
                      {treeData.tree_id === primaryTreeId && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  {tree?.description && (
                    <div className="text-sm text-gray-500 mt-1">{tree.description}</div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedTreeIds.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-sm">✓</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-green-800">Cross-tree branch</span>
              <span className="text-green-700"> - This branch will be shared across {selectedTreeIds.length} people&apos;s trees</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}