'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeafWithDetails, ReactionType } from '@/types/database'
import { BranchWithMembers } from '@/types/common'
import LeafCard from '@/components/leaves/LeafCard'
import { Icon } from '@/components/ui/IconLibrary'

interface TreeLeavesListProps {
  leaves: LeafWithDetails[]
  userBranches: BranchWithMembers[]
  userId: string
  loading: boolean
  onReaction: (leafId: string, reactionType: ReactionType) => void
  onComment: (leafId: string, comment: string) => void
  onShare: (leafId: string, branchIds: string[]) => void
  onLeafMove: (leafId: string, targetBranchId: string) => void
}

export function TreeLeavesList({
  leaves,
  userBranches,
  userId,
  loading,
  onReaction,
  onComment,
  onShare,
  onLeafMove
}: TreeLeavesListProps) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (leaves.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-gray-500"
      >
        <Icon name="leaf" className="w-16 h-16 mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">No memories found</h3>
        <p className="text-sm text-center max-w-md">
          This tree doesn't have any memories yet, or none match your current filter. 
          Try changing the filter or add some memories to get started!
        </p>
      </motion.div>
    )
  }

  return (
    <div className="p-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        layout
      >
        <AnimatePresence mode="popLayout">
          {leaves.map((leaf, index) => (
            <motion.div
              key={leaf.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { 
                  delay: index * 0.05,
                  duration: 0.3 
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8,
                transition: { duration: 0.2 }
              }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="transform-gpu"
            >
              <LeafCard
                leaf={leaf}
                userId={userId}
                userBranches={userBranches}
                onReaction={onReaction}
                onComment={onComment}
                onShare={onShare}
                onMove={onLeafMove}
                showBranchInfo={true}
                compact={false}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Scroll to top hint for long lists */}
      {leaves.length > 12 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Icon name="arrow-up" className="w-4 h-4 mr-2" />
            Back to top
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}