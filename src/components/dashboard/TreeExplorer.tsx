'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { LeafWithDetails, Branch, ReactionType } from '@/types/database'
import { TreeWithMembers, BranchWithMembers, FilterOption } from '@/types/common'
import LeafCard from '@/components/leaves/LeafCard'
import { useTreeLeaves, useAddLeafReaction, useAddLeafComment, useShareLeafWithBranches } from '@/hooks/use-leaves'
import { useTreeStats } from '@/hooks/use-trees'
import { useParallax, useShakeDetection, useParticleEffect } from '@/hooks/useTactileInteractions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DragDropProvider } from '@/components/common/DragDropProvider'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/IconLibrary'

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
  const [filter, setFilter] = useState<'all' | 'milestones' | 'recent'>('all')
  const [showShakeHint, setShowShakeHint] = useState(false)
  const router = useRouter()

  // Tactile interactions
  const scrollY = useParallax()
  const createParticles = useParticleEffect()

  // Parallax animations
  const headerControls = useAnimation()
  const backgroundControls = useAnimation()

  // Shake to shuffle leaves
  useShakeDetection(() => {
    if (filteredLeaves.length > 1) {
      // Trigger leaf shuffle animation and show particles
      createParticles(window.innerWidth / 2, window.innerHeight / 2, 8)
      setFilter(prev => prev === 'all' ? 'recent' : prev === 'recent' ? 'milestones' : 'all')
    }
  })

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

  const loading = leavesLoading || statsLoading

  // Auto-select tree based on selected branch
  useEffect(() => {
    if (selectedBranch && trees.length > 0) {
      const branch = userBranches.find(ub => ub.branches?.id === selectedBranch.id)
      if (branch?.branches?.tree_id) {
        const tree = trees.find(t => t.tree_id === branch.branches.tree_id)
        setSelectedTree(tree || null)
        
        // Animate tree selection
        headerControls.start({
          y: -10,
          opacity: 0.8
        })
        setTimeout(() => {
          headerControls.start({
            y: 0,
            opacity: 1
          })
        }, 300)
      }
    }
  }, [selectedBranch, trees, userBranches, headerControls])

  // Parallax effect on scroll
  useEffect(() => {
    backgroundControls.start({
      y: scrollY * 0.5,
      scale: 1 + scrollY * 0.0002
    })
    headerControls.start({
      y: scrollY * 0.3
    })
  }, [scrollY, backgroundControls, headerControls])

  const handleReaction = (leafId: string, reactionType: ReactionType) => {
    addReactionMutation.mutate({ leafId, reactionType })
  }

  const handleComment = (leafId: string, comment: string) => {
    addCommentMutation.mutate({ leafId, comment })
  }

  const handleShare = (leafId: string, branchIds: string[]) => {
    shareLeafMutation.mutate({ leafId, branchIds })
  }

  const handleLeafMove = (leafId: string, targetBranchId: string) => {
    // Handle leaf movement between branches
    createParticles(window.innerWidth / 2, 200, 5)
  }

  const filteredLeaves = leaves.filter(leaf => {
    switch (filter) {
      case 'milestones':
        return leaf.milestone_type !== null
      case 'recent':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return new Date(leaf.created_at) > weekAgo
      default:
        return true
    }
  })

  if (!selectedBranch || !selectedTree) {
    return (
      <DragDropProvider>
        <motion.div 
          className="h-full flex items-center justify-center bg-gradient-to-br from-leaf-100 to-sky-100 relative overflow-hidden"
          animate={backgroundControls}
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 animate-bounce" style={{ animationDelay: '0s' }}>
              <Icon name="flower" size="3xl" className="text-flower-400" />
            </div>
            <div className="absolute top-32 right-32 animate-bounce" style={{ animationDelay: '1s' }}>
              <Icon name="leaf" size="2xl" className="text-leaf-500" />
            </div>
            <div className="absolute bottom-20 left-32 animate-bounce" style={{ animationDelay: '2s' }}>
              <Icon name="flower2" size="3xl" className="text-flower-400" />
            </div>
            <div className="absolute bottom-32 right-20 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <Icon name="bug" size="xl" className="text-flower-400" />
            </div>
          </div>
          
          <Card variant="wooden" className="text-center max-w-md mx-4">
            <div className="p-8">
              <div className="w-20 h-20 bg-leaf-300 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-leaf-500 shadow-lg">
                <Icon name="trees" size="2xl" className="text-leaf-600" />
              </div>
              <h3 className="text-xl font-bold text-bark-400 mb-2 font-display">Welcome to your Community Grove!</h3>
              <p className="text-bark-400 mb-6 leading-relaxed">Select a branch from the sidebar to explore your precious group leaves and memories.</p>
              <Button
                variant="leaf"
                size="lg"
                tactile={false}
                onClick={() => router.push('/trees')}
                className="w-full hover:scale-[1.02] transition-transform duration-200"
              >
                <Icon name="sprout" size="sm" className="mr-2" />
                Manage Trees
              </Button>
            </div>
          </Card>
        </motion.div>
      </DragDropProvider>
    )
  }

  if (loading) {
    return (
      <DragDropProvider>
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-leaf-100 to-flower-400">
          <Card variant="leaf" className="text-center">
            <div className="p-8">
              <div className="relative mb-6 flex justify-center">
                <div className="animate-spin">
                  <Icon name="leaf" size="3xl" className="text-leaf-500" />
                </div>
                <div className="absolute inset-0 animate-ping flex items-center justify-center opacity-30">
                  <Icon name="sprout" size="2xl" className="text-leaf-400" />
                </div>
              </div>
              <p className="text-bark-400 font-display text-lg">Growing your leaves...</p>
              <div className="mt-4 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-leaf-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-leaf-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-leaf-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </Card>
        </div>
      </DragDropProvider>
    )
  }

  return (
    <DragDropProvider>
      <div className="h-full flex flex-col relative overflow-hidden">
        {/* Background with parallax */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-leaf-100 via-sky-100 to-flower-400 opacity-30"
          animate={backgroundControls}
        />
        
        {/* Tree Header */}
        <motion.div 
          className="relative z-10"
          animate={headerControls}
        >
          <Card variant="wooden" className="m-4 overflow-visible">
            <div className="bg-gradient-to-r from-leaf-500 via-leaf-300 to-sky-300 text-bark-400 p-6 rounded-3xl relative">
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-fruit-400 rounded-full border-4 border-leaf-100 shadow-lg flex items-center justify-center animate-pulse">
                <Icon name="sprout" size="sm" className="text-leaf-600" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-flower-400 rounded-full border-2 border-leaf-100 opacity-80 animate-bounce"></div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold flex items-center font-display mb-2">
                    <Icon name="trees" size="2xl" className="mr-4 text-leaf-600" />
                    {selectedTree.trees?.name || 'Community Tree'}
                  </h1>
                  <p className="text-bark-400/80 mt-1 text-lg leading-relaxed">
                    {selectedTree.trees?.description || 'A collection of precious group memories'}
                  </p>
                </div>
                <Button
                  variant="wooden"
                  size="lg"
                  onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
                  className="shadow-lg"
                >
                  <Icon name="fileText" size="sm" className="mr-2" />
                  View Full Timeline
                </Button>
              </div>
        
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-6 mt-8">
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-bark-400 font-display">{treeStats?.totalLeaves || 0}</div>
                  <div className="text-sm text-bark-400 font-semibold flex items-center justify-center gap-1">
                    <Icon name="leaf" size="xs" className="text-leaf-500" /> Total Leaves
                  </div>
                </Card>
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-bark-400 font-display">{treeStats?.milestoneCount || 0}</div>
                  <div className="text-sm text-bark-400 font-semibold flex items-center justify-center gap-1">
                    <Icon name="star" size="xs" className="text-flower-400" /> Milestones
                  </div>
                </Card>
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-bark-400 font-display">{treeStats?.recentLeaves || 0}</div>
                  <div className="text-sm text-bark-400 font-semibold flex items-center justify-center gap-1">
                    <Icon name="sparkles" size="xs" className="text-flower-400" /> This Week
                  </div>
                </Card>
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-bark-400 font-display">{Object.keys(treeStats?.seasonBreakdown || {}).length}</div>
                  <div className="text-sm text-bark-400 font-semibold flex items-center justify-center gap-1">
                    <Icon name="flower" size="xs" className="text-flower-400" /> Seasons
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Filter Bar */}
        <Card variant="leaf" className="m-4 relative z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-bark-400 font-display font-semibold flex items-center gap-2">
                  <Icon name="search" size="sm" className="text-bark-400" /> Filter by:
                </span>
                {[
                  { key: 'all', label: 'All Leaves', icon: 'leaf' },
                  { key: 'recent', label: 'This Week', icon: 'sparkles' },
                  { key: 'milestones', label: 'Milestones', icon: 'star' }
                ].map(({ key, label, icon }) => (
                  <Button
                    key={key}
                    variant={filter === key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setFilter(key as 'all' | 'milestones' | 'recent')
                      createParticles(window.innerWidth / 2, 100, 3)
                    }}
                    className={`transition-all duration-200 ${
                      filter === key ? 'shadow-lg' : ''
                    }`}
                  >
                    <Icon name={icon} size="sm" className="mr-2" />
                    {label}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center space-x-4">
                {showShakeHint && (
                  <div className="text-xs text-bark-200 font-display bg-fruit-400/20 px-3 py-1 rounded-full border border-fruit-400 animate-pulse flex items-center gap-1">
                    <Icon name="sparkles" size="xs" className="text-flower-400" />
                    Shake to shuffle!
                  </div>
                )}
                <Button
                  variant="leaf"
                  size="md"
                  tactile={false}
                  onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
                  className="shadow-lg"
                >
                  <span className="mr-2">+</span>
                  New Leaf
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Leaves Grid */}
        <div className="flex-1 overflow-auto relative">
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-20 h-20 bg-leaf-500/10 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-flower-400/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-20 left-32 w-24 h-24 bg-sky-300/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          
          {filteredLeaves.length > 0 ? (
            <div className="p-6 relative z-10">
              <motion.div 
                className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                layout
              >
                <AnimatePresence>
                  {filteredLeaves.map((leaf, index) => (
                    <motion.div 
                      key={leaf.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        delay: index * 0.1,
                        duration: 0.5,
                        type: "spring",
                        stiffness: 100
                      }}
                      layout
                    >
                      <LeafCard
                        leaf={leaf}
                        onReaction={handleReaction}
                        onShare={handleShare}
                        onComment={handleComment}
                        onMove={handleLeafMove}
                        className="h-full"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full relative">
              {/* Background decorations */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-1/4 left-1/4 rotate-12 animate-pulse">
                  <Icon name={filter === 'milestones' ? 'star' : filter === 'recent' ? 'calendarDays' : 'sprout'} size="3xl" className="text-leaf-400" />
                </div>
                <div className="absolute bottom-1/4 right-1/4 -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}>
                  <Icon name="leaf" size="3xl" className="text-leaf-500" />
                </div>
              </div>
              
              <Card variant="wooden" className="text-center max-w-lg mx-4 relative z-10">
                <div className="p-8">
                  <div className="w-20 h-20 bg-flower-400 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-flower-400 shadow-lg animate-bounce">
                    <Icon name={filter === 'milestones' ? 'star' : filter === 'recent' ? 'calendarDays' : 'sprout'} size="2xl" className="text-bark-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-bark-400 mb-4 font-display">
                    {filter === 'milestones' 
                      ? 'No milestones yet' 
                      : filter === 'recent' 
                      ? 'No leaves this week' 
                      : 'No leaves yet'}
                  </h3>
                  <p className="text-bark-400 mb-8 leading-relaxed">
                    {filter === 'all' 
                      ? 'Start capturing precious leaves to grow this beautiful tree!' 
                      : 'Try a different filter or create your first magical leaf.'}
                  </p>
                  <Button
                    variant="leaf"
                    size="lg"
                    tactile={false}
                    onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
                    className="w-full shadow-lg"
                  >
                    <Icon name="leaf" size="sm" className="mr-2" />
                    Create First Leaf
                  </Button>
                  
                  {/* Hint about shake gesture */}
                  <div className="mt-6 text-xs text-bark-200 font-display bg-leaf-300/20 px-4 py-2 rounded-full border border-leaf-300 flex items-center gap-2">
                    <Icon name="sparkles" size="xs" className="text-flower-400" />
                    Tip: Shake your device to shuffle leaves!
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DragDropProvider>
  )
})

export default TreeExplorer