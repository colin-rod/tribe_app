'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGesture } from '@use-gesture/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { TreeWithMembers, BranchWithMembers } from '@/types/common'
import { supabase } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/IconLibrary'
import { PinterestInboxPanel } from '@/components/leaves/PinterestInboxPanel'
import { TreeBranchView } from './TreeBranchView'
import { FloatingActionMenu } from './FloatingActionMenu'
import GlobalLeafCreator from '@/components/leaves/GlobalLeafCreator'
import MemoryCrystallizationPortal from '@/components/leaves/MemoryCrystallizationPortal'
import { useMemoryCrystallization } from '@/hooks/useMemoryCrystallization'
import { groupBranchesByTree, createDashboardHandlers } from '@/lib/dashboard-utils'
import { useInboxState } from '@/hooks/useInboxState'
import { useDashboardNavigation } from '@/hooks/useDashboardNavigation'

interface MinimalDashboardProps {
  user: User
  profile: Profile
  userBranches: BranchWithMembers[]
  trees: TreeWithMembers[]
}

export default function MinimalDashboard({ user, profile, userBranches, trees }: MinimalDashboardProps) {
  const [selectedBranch, setSelectedBranch] = useState<BranchWithMembers['branches'] | null>(null)
  const [showGlobalCreator, setShowGlobalCreator] = useState(false)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Custom hooks for state management
  const navigation = useDashboardNavigation({ initialView: 'inbox' })
  const inbox = useInboxState()
  const crystallization = useMemoryCrystallization()

  // Memoize expensive computations
  const branchesByTree = useMemo(() => 
    groupBranchesByTree(userBranches, trees), 
    [userBranches, trees]
  )
  
  // Memoize dashboard event handlers
  const handlers = useMemo(() => createDashboardHandlers({
    onMemoryAssigned: (leafId, branchIds) => {
      // Additional logic for memory assignment if needed
    },
    onContentCreation: (type) => {
      setShowGlobalCreator(true)
    }
  }), [])
  
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

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div 
        ref={containerRef}
        className="h-screen flex flex-col overflow-hidden"
        {...navigation.swipeHandlers()}
      >
        {/* View Indicator */}
        <motion.div 
          className="absolute top-4 right-4 flex items-center space-x-2 bg-white/60 rounded-full px-3 py-1 z-40"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
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
        >
          Swipe left/right to navigate
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
                crystallization={crystallization}
                onCrystallizationStart={() => {
                  // Dashboard will fade during crystallization
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