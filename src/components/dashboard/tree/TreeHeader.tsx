'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TreeWithMembers } from '@/types/common'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/IconLibrary'

interface TreeStats {
  totalLeaves: number
  milestoneCount: number
  recentLeaves: number
  leafTypeBreakdown: { [key: string]: number }
  seasonBreakdown: { [key: string]: number }
}

interface TreeHeaderProps {
  selectedTree: TreeWithMembers
  treeStats?: TreeStats
  loading: boolean
  scrollY: number
  headerControls: unknown
}

export function TreeHeader({ 
  selectedTree, 
  treeStats, 
  loading, 
  scrollY, 
  headerControls 
}: TreeHeaderProps) {
  return (
    <motion.div
      className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200"
      animate={headerControls}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Icon name="trees" className="w-6 h-6 mr-2 text-green-600" />
              {selectedTree.trees?.name || 'Family Tree'}
            </h2>
            <p className="text-gray-600 mt-1">
              {selectedTree.trees?.description || 'Explore your family memories'}
            </p>
          </div>

          {/* Tree Stats */}
          {!loading && treeStats && (
            <div className="flex space-x-4">
              <Card className="p-3 text-center">
                <div className="text-xl font-bold text-blue-600">
                  {treeStats.totalLeaves}
                </div>
                <div className="text-xs text-gray-600">Memories</div>
              </Card>
              
              <Card className="p-3 text-center">
                <div className="text-xl font-bold text-purple-600">
                  {treeStats.milestoneCount}
                </div>
                <div className="text-xs text-gray-600">Milestones</div>
              </Card>
              
              <Card className="p-3 text-center">
                <div className="text-xl font-bold text-green-600">
                  {treeStats.recentLeaves}
                </div>
                <div className="text-xs text-gray-600">Recent</div>
              </Card>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex space-x-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Parallax indicator */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-blue-500"
          style={{
            width: `${Math.min(100, Math.max(0, scrollY * 0.1))}%`
          }}
        />
      </div>
    </motion.div>
  )
}