'use client'

import { useState, useRef } from 'react'
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

interface MinimalDashboardProps {
  user: User
  profile: Profile
  userBranches: BranchWithMembers[]
  trees: TreeWithMembers[]
}

export default function MinimalDashboard({ user, profile, userBranches, trees }: MinimalDashboardProps) {
  const [currentView, setCurrentView] = useState<'inbox' | 'tree'>('inbox')
  const [selectedBranch, setSelectedBranch] = useState<BranchWithMembers['branches'] | null>(null)
  const [showGlobalCreator, setShowGlobalCreator] = useState(false)
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0)
  const [newlyCreatedMemoryId, setNewlyCreatedMemoryId] = useState<string | null>(null)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Memory crystallization animation
  const crystallization = useMemoryCrystallization()
  
  // Handler to refresh inbox data after new memory creation
  const handleRefreshInbox = (newMemoryId?: string) => {
    setInboxRefreshKey(prev => prev + 1)
    if (newMemoryId) {
      setNewlyCreatedMemoryId(newMemoryId)
      // Clear the memory ID after highlighting timeout
      setTimeout(() => {
        setNewlyCreatedMemoryId(null)
      }, 3000)
    }
  }

  // Group branches by tree
  const branchesByTree = userBranches?.reduce((acc, ub) => {
    const treeId = ub.branches?.tree_id
    if (!treeId) return acc
    
    const treeName = trees.find(t => t.tree_id === treeId)?.trees?.name || 'Unknown Tree'
    
    if (!acc[treeId]) {
      acc[treeId] = {
        tree: trees.find(t => t.tree_id === treeId)?.trees || { name: treeName, id: treeId },
        branches: []
      }
    }
    acc[treeId].branches.push(ub)
    return acc
  }, {} as Record<string, { tree: any, branches: BranchWithMembers[] }>) || {}

  // Gesture handling for swipe navigation
  const bind = useGesture({
    onDrag: ({ direction: [dx], distance, cancel }) => {
      if (distance > 100) {
        if (dx > 0 && currentView === 'tree') {
          setCurrentView('inbox')
          cancel()
        } else if (dx < 0 && currentView === 'inbox') {
          setCurrentView('tree')
          cancel()
        }
      }
    },
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div 
        ref={containerRef}
        className="h-screen flex flex-col overflow-hidden"
        {...bind()}
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
              currentView === 'inbox' ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              currentView === 'tree' ? 'bg-green-500' : 'bg-gray-300'
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
            {currentView === 'inbox' && (
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
                  onLeafAssigned={(leafId, branchIds) => {
                    console.log('Leaf assigned:', leafId, branchIds)
                  }}
                  onCreateContent={(type) => {
                    setShowGlobalCreator(true)
                  }}
                  incomingMemoryId={newlyCreatedMemoryId || crystallization.tempMemoryId}
                  onMemoryPositionCalculated={(rect) => {
                    crystallization.setGridPosition(rect)
                  }}
                  refreshKey={inboxRefreshKey}
                />
              </motion.div>
            )}

            {currentView === 'tree' && (
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
          onCreateLeaf={() => setShowGlobalCreator(true)}
          onSwitchView={() => setCurrentView(currentView === 'inbox' ? 'tree' : 'inbox')}
          currentView={currentView}
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
                onSave={(memoryId) => {
                  setShowGlobalCreator(false)
                  handleRefreshInbox(memoryId)
                  crystallization.completeCrystallization()
                }}
                onCancel={() => {
                  setShowGlobalCreator(false)
                  crystallization.resetCrystallization()
                }}
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