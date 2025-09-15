'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/IconLibrary'

type FilterType = 'all' | 'milestones' | 'recent'

interface TreeFilterBarProps {
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  filteredCount: number
  totalCount: number
  showShakeHint: boolean
  onShakeHintDismiss: () => void
}

export function TreeFilterBar({ 
  filter, 
  onFilterChange, 
  filteredCount, 
  totalCount, 
  showShakeHint,
  onShakeHintDismiss 
}: TreeFilterBarProps) {
  const filterOptions = [
    { 
      key: 'all' as FilterType, 
      label: 'All Memories', 
      icon: 'grid', 
      color: 'blue' 
    },
    { 
      key: 'milestones' as FilterType, 
      label: 'Milestones', 
      icon: 'star', 
      color: 'purple' 
    },
    { 
      key: 'recent' as FilterType, 
      label: 'Recent', 
      icon: 'clock', 
      color: 'green' 
    }
  ]

  return (
    <div className="p-4 bg-white/60 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between">
        {/* Filter Buttons */}
        <div className="flex space-x-2">
          {filterOptions.map((option) => (
            <Button
              key={option.key}
              variant={filter === option.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(option.key)}
              className={`
                transition-all duration-200 
                ${filter === option.key 
                  ? `bg-${option.color}-500 text-white` 
                  : `hover:bg-${option.color}-50 hover:border-${option.color}-300`
                }
              `}
            >
              <Icon name={option.icon} className="w-4 h-4 mr-2" />
              {option.label}
            </Button>
          ))}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredCount} of {totalCount} memories
        </div>
      </div>

      {/* Shake Hint */}
      {showShakeHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Icon name="shake" className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-sm text-blue-700">
                💡 Try shaking your device to shuffle through filters!
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShakeHintDismiss}
              className="text-blue-500 hover:text-blue-700"
            >
              <Icon name="x" className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}