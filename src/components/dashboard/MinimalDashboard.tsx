'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { TreeWithMembers } from '@/types/common'
import { BranchWithDetails, Profile } from '@/types/database'
import { supabase } from '@/lib/supabase/client'
import { PinterestInboxPanel } from '@/components/leaves/PinterestInboxPanel'
import { TreeBranchView } from './TreeBranchView'
import { FloatingActionMenu } from './FloatingActionMenu'
import GlobalLeafCreator from '@/components/leaves/GlobalLeafCreator'
import MemoryCrystallizationPortal from '@/components/leaves/MemoryCrystallizationPortal'
import { useMemoryCrystallization } from '@/hooks/useMemoryCrystallization'
import { groupBranchesByTree, createDashboardHandlers } from '@/lib/dashboard-utils'
import { useInboxState } from '@/hooks/useInboxState'
import { useDashboardNavigation } from '@/hooks/useDashboardNavigation'
import { createComponentLogger } from '@/lib/logger'

interface MinimalDashboardProps {
  user: User
  profile?: Profile
  userBranches: BranchWithDetails[]
  trees: TreeWithMembers[]
}

const logger = createComponentLogger('MinimalDashboard')

export default function MinimalDashboard({ user, profile, userBranches, trees }: MinimalDashboardProps) {
  // Basic prop validation
  if (!user?.id) {
    throw new Error('MinimalDashboard: user.id is required')
  }
  if (!Array.isArray(userBranches)) {
    throw new Error('MinimalDashboard: userBranches must be an array')
  }
  if (!Array.isArray(trees)) {
    throw new Error('MinimalDashboard: trees must be an array')
  }
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
  const [showGlobalCreator, setShowGlobalCreator] = useState(false)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Custom hooks for state management
  const navigation = useDashboardNavigation({ initialView: 'inbox' })
  const inbox = useInboxState()
  const crystallization = useMemoryCrystallization()

  // Memoize expensive computations
  const branchesByTree = useMemo(() => 
    groupBranchesByTree(userBranches as any, trees), 
    [userBranches, trees]
  )
  
  // Memoize dashboard event handlers
  const handlers = useMemo(() => createDashboardHandlers({
    onMemoryAssigned: (leafId, branchIds) => {
      try {
        // Handle memory assignment to branches
        if (!leafId || !branchIds?.length) {
          logger.warn('Invalid memory assignment data', {
            metadata: { leafId, branchIds }
          })
          return
        }
        logger.info('Memory assigned successfully', {
          metadata: { leafId, branchIds }
        })
        // TODO: Implement actual assignment logic
        inbox.handleRefresh()
      } catch (error) {
        logger.error('Error assigning memory', error, {
          metadata: { leafId, branchIds }
        })
      }
    },
    onContentCreation: () => {
      setShowGlobalCreator(true)
    }
  }), [inbox])
  
  // Memoize stable callbacks
  const handleCreateMemory = useCallback(() => {
    setShowGlobalCreator(true)
  }, [])
  
  const handleMemorySave = useCallback((memoryId?: string) => {
    setShowGlobalCreator(false)
    inbox.handleRefresh(memoryId)
    crystallization.completeCrystallization()
  }, [inbox, crystallization])
  
  const handleMemoryCancel = useCallback(() => {
    setShowGlobalCreator(false)
    crystallization.resetCrystallization()
  }, [crystallization])

  // Handle sign out with error handling
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      logger.error('Sign out failed', error)
      // Still redirect on error as a fallback
      router.push('/')
    }
  }, [router])

  return (
    <DndProvider backend={HTML5Backend}>
      <div 
        ref={containerRef}
        className="h-screen flex flex-col overflow-hidden"
        {...navigation.swipeHandlers()}
      >
        {/* Header with View Indicator and Sign Out */}
        <motion.div 
          className="absolute top-4 right-4 flex items-center space-x-3 z-40"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* View Indicator */}
          <div className="flex items-center space-x-2 bg-white/60 rounded-full px-3 py-1">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                navigation.isInboxView ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                navigation.isTreeView ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={() => router.push('/profile')}
              className="bg-white/60 hover:bg-white/80 rounded-full p-2 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="View profile"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </motion.button>
            
            <motion.button
              onClick={handleSignOut}
              className="bg-white/60 hover:bg-white/80 rounded-full p-2 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Sign out"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div 
          className="flex-1 relative overflow-hidden"
          animate={{
            opacity: crystallization.state === 'flying' ? 0.3 : 1,
            filter: crystallization.state === 'flying' ? 'blur(2px)' : 'blur(0px)'
          }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {navigation.isInboxView && (
              <motion.div
                key="inbox"
                className="absolute inset-0"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PinterestInboxPanel
                  userId={user.id}
                  onLeafAssigned={handlers.handleMemoryAssigned}
                  onCreateContent={handlers.handleContentCreation}
                  incomingMemoryId={inbox.newlyCreatedMemoryId || crystallization.tempMemoryId}
                  onMemoryPositionCalculated={(rect) => {
                    crystallization.setGridPosition(rect)
                  }}
                  refreshKey={inbox.refreshKey}
                />
              </motion.div>
            )}

            {navigation.isTreeView && (
              <motion.div
                key="tree"
                className="absolute inset-0"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TreeBranchView
                  branchesByTree={branchesByTree}
                  selectedBranch={selectedBranch}
                  onBranchSelect={setSelectedBranch}
                  userId={user.id}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation Hints */}
        <motion.div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white/60 px-3 py-1 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          role="status"
          aria-label="Navigation instructions"
        >
          Swipe left/right to navigate between inbox and trees
        </motion.div>

        {/* Floating Action Menu */}
        <FloatingActionMenu
          onCreateMemory={handleCreateMemory}
          onSwitchView={navigation.switchView}
          currentView={navigation.currentView}
        />

        {/* Global Leaf Creator Modal */}
        <AnimatePresence>
          {showGlobalCreator && (
            <motion.div
              className="fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlobalLeafCreator
                onSave={handleMemorySave}
                onCancel={handleMemoryCancel}
                userId={user.id}
                onCrystallizationStart={() => {
                  // Dashboard will fade during crystallization
                }}
                onCrystallizationComplete={() => {
                  crystallization.completeCrystallization()
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Memory Crystallization Portal */}
        <MemoryCrystallizationPortal
          isVisible={crystallization.state === 'flying'}
          memoryPreview={crystallization.memoryPreview}
          coordinates={crystallization.coordinates}
          tempMemoryId={crystallization.tempMemoryId}
          onAnimationComplete={() => {
            crystallization.completeCrystallization()
          }}
        />

{/* Background overlay removed for simpler interaction */}
      </div>
    </DndProvider>
  )
}