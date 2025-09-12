'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDrop } from 'react-dnd'
import { BranchWithMembers } from '@/types/common'
import { Icon } from '@/components/ui/IconLibrary'
import { assignLeafToBranches } from '@/lib/leaf-assignments'
import { useToast } from '@/hooks/use-toast'

interface TreeBranchViewProps {
  branchesByTree: Record<string, { tree: any, branches: BranchWithMembers[] }>
  selectedBranch: BranchWithMembers['branches'] | null
  onBranchSelect: (branch: BranchWithMembers['branches'] | null) => void
  userId: string
}

interface DroppableBranchProps {
  branch: BranchWithMembers['branches']
  isSelected: boolean
  onClick: () => void
  onLeafDrop: (leafId: string, branchId: string) => void
}

function DroppableBranch({ branch, isSelected, onClick, onLeafDrop }: DroppableBranchProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'LEAF',
    drop: (item: { id: string, type: string }) => {
      onLeafDrop(item.id, branch.id)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })

  const isActive = canDrop && isOver

  return (
    <motion.div
      ref={drop}
      className={`relative group cursor-pointer transition-all duration-300 ${
        isSelected ? 'scale-105 z-10' : ''
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.02, rotateY: 5 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        scale: isActive ? 1.1 : 1,
        rotateY: isActive ? 10 : 0,
      }}
    >
      {/* Branch Container */}
      <div
        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
          isActive
            ? 'border-leaf-400 bg-leaf-50 shadow-xl'
            : isSelected
            ? 'border-leaf-300 bg-white shadow-lg'
            : 'border-gray-200 bg-white shadow-md hover:shadow-lg hover:border-gray-300'
        }`}
        style={{
          background: isActive 
            ? `linear-gradient(135deg, ${branch.color}20, ${branch.color}10)`
            : isSelected
            ? `linear-gradient(135deg, ${branch.color}15, transparent)`
            : undefined
        }}
      >
        {/* Drop indicator */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-dashed border-leaf-500 bg-leaf-100/50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="flex items-center space-x-2 bg-leaf-600 text-white px-4 py-2 rounded-full"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Icon name="leaf" size="sm" />
                <span className="text-sm font-medium">Drop here</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Branch Color Indicator */}
        <div className="flex items-start space-x-4">
          <motion.div
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: branch.color }}
            whileHover={{ scale: 1.2 }}
          />

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {branch.name}
            </h3>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Icon name="users" size="xs" className="text-gray-400" />
                <span>Members</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Icon name="leaf" size="xs" className="text-gray-400" />
                <span>Memories</span>
              </div>
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <motion.div
              className="w-6 h-6 rounded-full bg-leaf-500 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Icon name="check" size="xs" className="text-white" />
            </motion.div>
          )}
        </div>

        {/* Hover effect - subtle glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${branch.color}20, transparent 70%)`
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}

export function TreeBranchView({ branchesByTree, selectedBranch, onBranchSelect, userId }: TreeBranchViewProps) {
  const [expandedTrees, setExpandedTrees] = useState<Set<string>>(new Set(Object.keys(branchesByTree)))
  const { toast } = useToast()

  const handleLeafDrop = async (leafId: string, branchId: string) => {
    try {
      await assignLeafToBranches(leafId, [branchId])
      toast({
        title: "Memory assigned",
        description: "Successfully moved memory to branch",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign memory to branch",
        variant: "destructive"
      })
    }
  }

  const toggleTree = (treeId: string) => {
    const newExpanded = new Set(expandedTrees)
    if (newExpanded.has(treeId)) {
      newExpanded.delete(treeId)
    } else {
      newExpanded.add(treeId)
    }
    setExpandedTrees(newExpanded)
  }

  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Family Trees</h2>
          <p className="text-gray-600">Drag memories from the inbox to organize them in your family branches</p>
        </motion.div>

        {/* Trees and Branches */}
        <div className="space-y-8">
          {Object.entries(branchesByTree).map(([treeId, treeData], treeIndex) => (
            <motion.div
              key={treeId}
              className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * treeIndex, duration: 0.5 }}
            >
              {/* Tree Header */}
              <motion.button
                className="w-full p-6 text-left bg-gradient-to-r from-bark-50 to-leaf-50 hover:from-bark-100 hover:to-leaf-100 transition-colors"
                onClick={() => toggleTree(treeId)}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-bark-200 rounded-full flex items-center justify-center">
                      <Icon name="trees" size="md" className="text-bark-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{treeData.tree.name}</h3>
                      <p className="text-sm text-gray-600">
                        {treeData.branches.length} branch{treeData.branches.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: expandedTrees.has(treeId) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon name="chevronDown" size="md" className="text-gray-500" />
                  </motion.div>
                </div>
              </motion.button>

              {/* Branches */}
              <AnimatePresence>
                {expandedTrees.has(treeId) && (
                  <motion.div
                    className="p-6"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {treeData.branches.map((userBranch, branchIndex) => (
                        <motion.div
                          key={userBranch.branches?.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 * branchIndex, duration: 0.3 }}
                        >
                          <DroppableBranch
                            branch={userBranch.branches!}
                            isSelected={selectedBranch?.id === userBranch.branches?.id}
                            onClick={() => onBranchSelect(
                              selectedBranch?.id === userBranch.branches?.id 
                                ? null 
                                : userBranch.branches!
                            )}
                            onLeafDrop={handleLeafDrop}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {Object.keys(branchesByTree).length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="trees" size="xl" className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Family Trees Yet</h3>
            <p className="text-gray-600 mb-6">Create your first family tree and branches to start organizing memories</p>
            <motion.button
              className="inline-flex items-center px-6 py-3 bg-leaf-600 text-white rounded-full hover:bg-leaf-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon name="plus" size="sm" className="mr-2" />
              Create Tree
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}