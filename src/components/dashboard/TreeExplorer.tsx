'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LeafWithDetails, Branch, ReactionType } from '@/types/database'
import { getTreeLeaves, getTreeStats, addLeafReaction, addLeafComment, shareLeafWithBranches } from '@/lib/leaves'
import LeafCard from '@/components/leaves/LeafCard'

interface TreeExplorerProps {
  selectedBranch: Branch | null
  trees: any[]
  userBranches: any[]
  userId: string
}

interface TreeStats {
  totalLeaves: number
  milestoneCount: number
  recentLeaves: number
  leafTypeBreakdown: { [key: string]: number }
  seasonBreakdown: { [key: string]: number }
}

export default function TreeExplorer({ 
  selectedBranch, 
  trees, 
  userBranches, 
  userId 
}: TreeExplorerProps) {
  const [leaves, setLeaves] = useState<LeafWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTree, setSelectedTree] = useState<any>(null)
  const [treeStats, setTreeStats] = useState<TreeStats>({
    totalLeaves: 0,
    milestoneCount: 0,
    recentLeaves: 0,
    leafTypeBreakdown: {},
    seasonBreakdown: {}
  })
  const [filter, setFilter] = useState<'all' | 'milestones' | 'recent'>('all')
  const router = useRouter()

  // Auto-select tree based on selected branch
  useEffect(() => {
    if (selectedBranch && trees.length > 0) {
      const branch = userBranches.find(ub => ub.branches?.id === selectedBranch.id)
      if (branch?.branches?.tree_id) {
        const tree = trees.find(t => t.tree_id === branch.branches.tree_id)
        setSelectedTree(tree)
      }
    }
  }, [selectedBranch, trees, userBranches])

  // Load leaves when tree is selected
  useEffect(() => {
    if (selectedTree?.tree_id) {
      loadTreeData(selectedTree.tree_id)
    }
  }, [selectedTree])

  const loadTreeData = async (treeId: string) => {
    setLoading(true)
    try {
      // Load leaves for the tree
      const treeLeaves = await getTreeLeaves(treeId, 50, 0)
      setLeaves(treeLeaves)

      // Load tree stats
      const stats = await getTreeStats(treeId)
      setTreeStats(stats)
    } catch (error) {
      console.error('Error loading tree data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReaction = async (leafId: string, reactionType: ReactionType) => {
    const success = await addLeafReaction(leafId, reactionType)
    if (success && selectedTree?.tree_id) {
      // Refresh leaves
      const updatedLeaves = await getTreeLeaves(selectedTree.tree_id, 50, 0)
      setLeaves(updatedLeaves)
    }
  }

  const handleComment = async (leafId: string, comment: string) => {
    const success = await addLeafComment(leafId, comment)
    if (success && selectedTree?.tree_id) {
      // Refresh leaves
      const updatedLeaves = await getTreeLeaves(selectedTree.tree_id, 50, 0)
      setLeaves(updatedLeaves)
    }
  }

  const handleShare = async (leafId: string, branchIds: string[]) => {
    const success = await shareLeafWithBranches(leafId, branchIds)
    if (success && selectedTree?.tree_id) {
      // Refresh leaves
      const updatedLeaves = await getTreeLeaves(selectedTree.tree_id, 50, 0)
      setLeaves(updatedLeaves)
    }
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
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌳</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to your Memory Trees</h3>
          <p className="text-gray-600 mb-4">Select a branch from the sidebar to explore your family memories.</p>
          <button
            onClick={() => router.push('/trees')}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <span className="mr-2">🌱</span>
            Manage Trees
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🌿</div>
          <p className="text-gray-600">Loading memories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tree Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <span className="mr-3">🌳</span>
              {selectedTree.trees?.name || 'Memory Tree'}
            </h1>
            <p className="text-green-100 mt-1">
              {selectedTree.trees?.description || 'A collection of precious family memories'}
            </p>
          </div>
          <button
            onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            View Full Timeline
          </button>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{treeStats.totalLeaves}</div>
            <div className="text-sm text-green-100">Total Leaves</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{treeStats.milestoneCount}</div>
            <div className="text-sm text-green-100">Milestones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{treeStats.recentLeaves}</div>
            <div className="text-sm text-green-100">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{Object.keys(treeStats.seasonBreakdown).length}</div>
            <div className="text-sm text-green-100">Seasons</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Filter by:</span>
            {[
              { key: 'all', label: 'All Memories', icon: '🌿' },
              { key: 'recent', label: 'This Week', icon: '✨' },
              { key: 'milestones', label: 'Milestones', icon: '⭐' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>New Memory</span>
          </button>
        </div>
      </div>

      {/* Memories Grid */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {filteredLeaves.length > 0 ? (
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredLeaves.map((leaf) => (
                <LeafCard
                  key={leaf.id}
                  leaf={leaf}
                  onReaction={handleReaction}
                  onShare={handleShare}
                  onComment={handleComment}
                  className="transform hover:scale-105 transition-transform duration-200"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {filter === 'milestones' ? '⭐' : filter === 'recent' ? '📅' : '🌱'}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'milestones' 
                  ? 'No milestones yet' 
                  : filter === 'recent' 
                  ? 'No memories this week' 
                  : 'No memories yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'Start capturing precious memories to grow this tree!' 
                  : 'Try a different filter or create your first memory.'}
              </p>
              <button
                onClick={() => router.push(`/trees/${selectedTree.tree_id}/leaves`)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center mx-auto"
              >
                <span className="mr-2">🌿</span>
                Create First Memory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}