'use client'

import React, { useState, useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { LeafWithDetails, Branch, ReactionType } from '@/types/database'
import { TreeWithMembers, BranchWithMembers } from '@/types/common'
import { useTreeLeaves, useAddLeafReaction, useAddLeafComment, useShareLeafWithBranches } from '@/hooks/use-leaves'
import { useTreeStats } from '@/hooks/use-trees'
import { useTreeFiltering, FilterType } from '@/hooks/useTreeFiltering'
import { useTreeAnimations } from '@/hooks/useTreeAnimations'
import { DragDropProvider } from '@/components/common/DragDropProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { TreeHeader } from './tree/TreeHeader'
import { TreeFilterBar } from './tree/TreeFilterBar'
import { TreeLeavesList } from './tree/TreeLeavesList'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('TreeExplorer')

interface TreeExplorerProps {
  selectedBranch: Branch | null
  trees: TreeWithMembers[]
  userBranches: BranchWithMembers[]
  userId: string
}

interface TreeStats {
  totalLeaves: number
  milestoneCount: number
  recentLeaves: number
  leafTypeBreakdown: { [key: string]: number }
  seasonBreakdown: { [key: string]: number }
}

const TreeExplorer = memo(function TreeExplorer({ 
  selectedBranch, 
  trees, 
  userBranches, 
  userId 
}: TreeExplorerProps) {
  const [selectedTree, setSelectedTree] = useState<TreeWithMembers | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showShakeHint, setShowShakeHint] = useState(false)
  const router = useRouter()

  // React Query hooks
  const { data: leaves = [], isLoading: leavesLoading } = useTreeLeaves(
    selectedTree?.tree_id || '', 
    { limit: 50, offset: 0 },
    !!selectedTree?.tree_id
  )
  
  const { data: treeStats, isLoading: statsLoading } = useTreeStats(
    selectedTree?.tree_id || '',
    !!selectedTree?.tree_id
  )

  // Mutations
  const addReactionMutation = useAddLeafReaction()
  const addCommentMutation = useAddLeafComment()
  const shareLeafMutation = useShareLeafWithBranches()

  // Custom hooks
  const { filteredLeaves, filterStats, getNextFilter } = useTreeFiltering({
    leaves,
    filter
  })

  const { 
    scrollY, 
    headerControls, 
    backgroundControls, 
    createMoveParticles,
    animations 
  } = useTreeAnimations({
    selectedTree,
    filteredLeavesCount: filteredLeaves.length,
    onFilterCycle: () => setFilter(getNextFilter(filter)),
    onShowShakeHint: () => setShowShakeHint(true)
  })

  const loading = leavesLoading || statsLoading

  // Auto-select tree based on selected branch
  useEffect(() => {
    if (selectedBranch && trees.length > 0) {
      const branch = userBranches.find(ub => ub.branches?.id === selectedBranch.id)
      if (branch?.branches?.tree_id) {
        const tree = trees.find(t => t.tree_id === branch.branches?.tree_id)
        setSelectedTree(tree || null)
        
        logger.info('Tree selected', {
          metadata: {
            treeId: tree?.tree_id,
            treeName: tree?.trees?.name,
            branchId: selectedBranch.id
          }
        })
      }
    }
  }, [selectedBranch, trees, userBranches])

  // Event handlers
  const handleReaction = (leafId: string, reactionType: ReactionType) => {
    addReactionMutation.mutate({ leafId, reactionType })
    logger.info('Leaf reaction added', {
      metadata: { leafId, reactionType }
    })
  }

  const handleComment = (leafId: string, comment: string) => {
    addCommentMutation.mutate({ leafId, comment })
    logger.info('Leaf comment added', {
      metadata: { leafId, commentLength: comment.length }
    })
  }

  const handleShare = (leafId: string, branchIds: string[]) => {
    shareLeafMutation.mutate({ leafId, branchIds })
    logger.info('Leaf shared', {
      metadata: { leafId, branchCount: branchIds.length }
    })
  }

  const handleLeafMove = (leafId: string, targetBranchId: string) => {
    createMoveParticles()
    logger.info('Leaf moved', {
      metadata: { leafId, targetBranchId }
    })
    // TODO: Implement actual leaf movement logic
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    logger.info('Filter changed', {
      metadata: { 
        from: filter, 
        to: newFilter,
        resultCount: filterStats.filtered 
      }
    })
  }

  const handleShakeHintDismiss = () => {
    setShowShakeHint(false)
    logger.info('Shake hint dismissed')
  }

  // Empty state when no branch/tree selected
  if (!selectedBranch || !selectedTree) {
    return (
      <DragDropProvider>
        <motion.div 
          className="h-full flex items-center justify-center bg-gradient-to-br from-leaf-100 to-sky-100 relative overflow-hidden"
          {...animations.entrance}
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-green-300 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-300 rounded-full"
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>

          <div className="text-center z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <span className="text-4xl">🌳</span>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-gray-800 mb-4"
            >
              Select a Branch to Explore
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-gray-600 max-w-md mx-auto leading-relaxed"
            >
              Choose a branch from your family tree to view and explore memories. 
              Each branch contains unique stories and moments from your family's journey.
            </motion.p>
            
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/dashboard')}
              className="mt-8 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg"
            >
              Go to Dashboard
            </motion.button>
          </div>
        </motion.div>
      </DragDropProvider>
    )
  }

  return (
    <DragDropProvider>
      <motion.div 
        className="h-full flex flex-col bg-gradient-to-br from-leaf-50 to-sky-50 relative overflow-hidden"
        animate={backgroundControls}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-16 h-16 bg-green-400 rounded-full"
            animate={{
              x: scrollY * 0.1,
              y: scrollY * 0.05,
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-40 right-20 w-12 h-12 bg-blue-400 rounded-full"
            animate={{
              x: -scrollY * 0.15,
              y: scrollY * 0.08,
              scale: [1.1, 1, 1.1],
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>

        {/* Tree Header */}
        <TreeHeader
          selectedTree={selectedTree}
          treeStats={treeStats}
          loading={loading}
          scrollY={scrollY}
          headerControls={headerControls}
        />

        {/* Filter Bar */}
        <TreeFilterBar
          filter={filter}
          onFilterChange={handleFilterChange}
          filteredCount={filteredLeaves.length}
          totalCount={leaves.length}
          showShakeHint={showShakeHint}
          onShakeHintDismiss={handleShakeHintDismiss}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <TreeLeavesList
            leaves={filteredLeaves}
            userBranches={userBranches}
            userId={userId}
            loading={loading}
            onReaction={handleReaction}
            onComment={handleComment}
            onShare={handleShare}
            onLeafMove={handleLeafMove}
          />
        </div>
      </motion.div>
    </DragDropProvider>
  )
})

export default TreeExplorer