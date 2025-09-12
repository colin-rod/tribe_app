'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGesture } from '@use-gesture/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Image from 'next/image'
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
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

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
        className="h-screen bg-gradient-to-br from-leaf-50 to-bark-50 flex flex-col overflow-hidden"
        {...bind()}
      >
        {/* Minimal Header */}
        <motion.header 
          className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-white/20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.02 }}
          >
            <Icon name="trees" size="lg" className="text-leaf-600" />
            <h1 className="text-xl font-semibold text-gray-900">Tribe</h1>
          </motion.div>

          <div className="flex items-center space-x-4">
            {/* View Indicator */}
            <div className="flex items-center space-x-2 bg-white/60 rounded-full px-3 py-1">
              <motion.div
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentView === 'inbox' ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                whileHover={{ scale: 1.2 }}
              />
              <motion.div
                className={`w-2 h-2 rounded-full transition-colors ${
                  currentView === 'tree' ? 'bg-green-500' : 'bg-gray-300'
                }`}
                whileHover={{ scale: 1.2 }}
              />
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                {profile?.avatar_url ? (
                  <Image
                    className="w-8 h-8 rounded-full object-cover"
                    src={profile.avatar_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className="w-8 h-8 bg-leaf-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-leaf-700">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </span>
                  </div>
                )}
              </button>

              {/* Profile Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        router.push('/profile')
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Icon name="user" size="sm" className="text-gray-500" />
                      <span className="text-sm text-gray-700">Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/settings')
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Icon name="settings" size="sm" className="text-gray-500" />
                      <span className="text-sm text-gray-700">Settings</span>
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        handleSignOut()
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                    >
                      <Icon name="logOut" size="sm" className="text-red-500" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                </div>
              )}
            </div>
          </div>
        </motion.header>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
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
        </div>

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
                onSave={() => setShowGlobalCreator(false)}
                onCancel={() => setShowGlobalCreator(false)}
                userBranches={userBranches}
                userId={user.id}
              />
            </motion.div>
          )}
        </AnimatePresence>

{/* Background overlay removed for simpler interaction */}
      </div>
    </DndProvider>
  )
}