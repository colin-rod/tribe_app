'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { LeafWithDetails, Branch, ReactionType } from '@/types/database'
import { TreeWithMembers, BranchWithMembers, FilterOption } from '@/types/common'
import LeafCard from '@/components/leaves/LeafCard'
import { useTreeLeaves, useAddLeafReaction, useAddLeafComment, useShareLeafWithBranches } from '@/hooks/use-leaves'
import { useTreeStats } from '@/hooks/use-trees'
import { useParallax, useShakeDetection, useGestureRecognition, useParticleEffect } from '@/hooks/useTactileInteractions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DragDropProvider } from '@/components/common/DragDropProvider'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'

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
  const { recordGesture, checkPattern, clearGestures } = useGestureRecognition()

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
  }, [selectedBranch, trees, userBranches, headerApi])

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
    recordGesture('reaction')
    
    // Special gesture pattern: 5 reactions in sequence triggers celebration
    if (checkPattern('reaction-reaction-reaction-reaction-reaction')) {
      createParticles(window.innerWidth / 2, window.innerHeight / 2, 15)
      clearGestures()
    }
  }

  const handleComment = (leafId: string, comment: string) => {
    addCommentMutation.mutate({ leafId, comment })
    recordGesture('comment')
  }

  const handleShare = (leafId: string, branchIds: string[]) => {
    shareLeafMutation.mutate({ leafId, branchIds })
    recordGesture('share')
  }

  const handleLeafMove = (leafId: string, targetBranchId: string) => {
    // Handle leaf movement between branches
    recordGesture('move')
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
          className="h-full flex items-center justify-center bg-gradient-to-br from-ac-cream to-ac-sky-light relative overflow-hidden"
          animate={backgroundControls}
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>🌸</div>
            <div className="absolute top-32 right-32 text-4xl animate-bounce" style={{ animationDelay: '1s' }}>🍃</div>
            <div className="absolute bottom-20 left-32 text-5xl animate-bounce" style={{ animationDelay: '2s' }}>🌻</div>
            <div className="absolute bottom-32 right-20 text-3xl animate-bounce" style={{ animationDelay: '0.5s' }}>🦋</div>
          </div>
          
          <Card variant="wooden" className="text-center max-w-md mx-4">
            <div className="p-8">
              <div className="w-20 h-20 bg-ac-sage-light rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-ac-sage shadow-lg">
                <span className="text-4xl">🌳</span>
              </div>
              <h3 className="text-xl font-bold text-ac-brown-dark mb-2 font-display">Welcome to your Community Grove!</h3>
              <p className="text-ac-brown mb-6 leading-relaxed">Select a branch from the sidebar to explore your precious group leaves and memories.</p>
              <Button
                variant="leaf"
                size="lg"
                tactile={false}
                onClick={() => router.push('/trees')}
                className="w-full hover:scale-[1.02] transition-transform duration-200"
              >
                🌱 Manage Trees
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
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-ac-cream to-ac-peach-light">
          <Card variant="leaf" className="text-center">
            <div className="p-8">
              <div className="relative mb-6">
                <div className="animate-spin text-6xl">🍃</div>
                <div className="absolute inset-0 animate-ping text-4xl flex items-center justify-center opacity-30">🌱</div>
              </div>
              <p className="text-ac-brown font-display text-lg">Growing your leaves...</p>
              <div className="mt-4 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-ac-sage rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-ac-sage rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-ac-sage rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
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
          className="absolute inset-0 bg-gradient-to-br from-ac-cream via-ac-sky-light to-ac-peach-light opacity-30"
          animate={backgroundControls}
        />
        
        {/* Tree Header */}
        <motion.div 
          className="relative z-10"
          animate={headerControls}
        >
          <Card variant="wooden" className="m-4 overflow-visible">
            <div className="bg-gradient-to-r from-ac-sage via-ac-sage-light to-ac-sky text-ac-brown-dark p-6 rounded-3xl relative">
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-ac-yellow rounded-full border-4 border-ac-cream shadow-lg flex items-center justify-center text-lg animate-pulse">
                🌱
              </div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-ac-coral rounded-full border-2 border-ac-cream opacity-80 animate-bounce"></div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold flex items-center font-display mb-2">
                    <span className="mr-4 text-4xl">🌳</span>
                    {selectedTree.trees?.name || 'Community Tree'}
                  </h1>
                  <p className="text-ac-brown-dark/80 mt-1 text-lg leading-relaxed">
                    {selectedTree.trees?.description || 'A collection of precious group memories'}
                  </p>
                </div>
                <Button
                  variant="wooden"
                  size="lg"
                  onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
                  className="shadow-lg"
                >
                  📜 View Full Timeline
                </Button>
              </div>
        
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-6 mt-8">
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-ac-brown-dark font-display">{treeStats?.totalLeaves || 0}</div>
                  <div className="text-sm text-ac-brown font-semibold">🌿 Total Leaves</div>
                </Card>
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-ac-brown-dark font-display">{treeStats?.milestoneCount || 0}</div>
                  <div className="text-sm text-ac-brown font-semibold">⭐ Milestones</div>
                </Card>
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-ac-brown-dark font-display">{treeStats?.recentLeaves || 0}</div>
                  <div className="text-sm text-ac-brown font-semibold">✨ This Week</div>
                </Card>
                <Card variant="bulletin" className="text-center py-4 px-2 transform hover:scale-[1.01] transition-transform">
                  <div className="text-3xl font-bold text-ac-brown-dark font-display">{Object.keys(treeStats?.seasonBreakdown || {}).length}</div>
                  <div className="text-sm text-ac-brown font-semibold">🌸 Seasons</div>
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
                <span className="text-sm text-ac-brown-dark font-display font-semibold">🔍 Filter by:</span>
                {[
                  { key: 'all', label: 'All Leaves', icon: '🌿' },
                  { key: 'recent', label: 'This Week', icon: '✨' },
                  { key: 'milestones', label: 'Milestones', icon: '⭐' }
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
                    <span className="mr-2">{icon}</span>
                    {label}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center space-x-4">
                {showShakeHint && (
                  <div className="text-xs text-ac-brown-light font-display bg-ac-yellow/20 px-3 py-1 rounded-full border border-ac-yellow animate-pulse">
                    📱 Shake to shuffle!
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
            <div className="absolute top-10 left-10 w-20 h-20 bg-ac-sage/10 rounded-full animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-ac-peach/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-20 left-32 w-24 h-24 bg-ac-sky/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
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
                <div className="absolute top-1/4 left-1/4 text-9xl rotate-12 animate-pulse">{filter === 'milestones' ? '⭐' : filter === 'recent' ? '📅' : '🌱'}</div>
                <div className="absolute bottom-1/4 right-1/4 text-7xl -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}>🌿</div>
              </div>
              
              <Card variant="wooden" className="text-center max-w-lg mx-4 relative z-10">
                <div className="p-8">
                  <div className="w-20 h-20 bg-ac-peach-light rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-ac-peach shadow-lg animate-bounce">
                    <span className="text-4xl">
                      {filter === 'milestones' ? '⭐' : filter === 'recent' ? '📅' : '🌱'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-ac-brown-dark mb-4 font-display">
                    {filter === 'milestones' 
                      ? 'No milestones yet' 
                      : filter === 'recent' 
                      ? 'No leaves this week' 
                      : 'No leaves yet'}
                  </h3>
                  <p className="text-ac-brown mb-8 leading-relaxed">
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
                    <span className="mr-2">🌿</span>
                    Create First Leaf
                  </Button>
                  
                  {/* Hint about shake gesture */}
                  <div className="mt-6 text-xs text-ac-brown-light font-display bg-ac-sage-light/20 px-4 py-2 rounded-full border border-ac-sage-light">
                    💡 Tip: Shake your device to shuffle leaves!
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