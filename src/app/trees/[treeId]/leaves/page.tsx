'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Tree, Branch, LeafWithDetails, Milestone, ReactionType } from '@/types/database'
import TreeTimeline from '@/components/leaves/TreeTimeline'
import LeafCreator from '@/components/leaves/LeafCreator'
import LeafViewer from '@/components/leaves/LeafViewer'
import BranchSelector from '@/components/leaves/BranchSelector'
import { 
  getTreeLeaves, 
  addLeafReaction, 
  addLeafComment, 
  shareLeafWithBranches, 
  createLeaf,
  getMilestones,
  getTreeStats 
} from '@/lib/leaves'
import { supabase } from '@/lib/supabase/client'

interface TreeLeavesPageProps {
  params: { treeId: string }
}

export default function TreeLeavesPage() {
  const params = useParams()
  const router = useRouter()
  const treeId = params?.treeId as string

  const [tree, setTree] = useState<Tree | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [leaves, setLeaves] = useState<LeafWithDetails[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // UI State
  const [showCreator, setShowCreator] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [treeStats, setTreeStats] = useState({
    totalLeaves: 0,
    milestoneCount: 0,
    recentLeaves: 0,
    leafTypeBreakdown: {} as { [key: string]: number },
    seasonBreakdown: {} as { [key: string]: number }
  })

  // Load initial data
  useEffect(() => {
    if (treeId) {
      loadInitialData()
    }
  }, [treeId])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // Load tree data
      const { data: treeData, error: treeError } = await supabase
        .from('trees')
        .select('*')
        .eq('id', treeId)
        .single()

      if (treeError) {
        console.error('Error loading tree:', treeError)
        return
      }

      setTree(treeData)

      // Load branches for this tree
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select(`
          *,
          branch_members (
            id,
            user_id,
            role,
            status
          )
        `)
        .eq('tree_id', treeId)

      if (branchError) {
        console.error('Error loading branches:', branchError)
      } else {
        setBranches(branchData || [])
      }

      // Load milestones
      const milestonesData = await getMilestones()
      setMilestones(milestonesData)

      // Load initial leaves
      const leavesData = await getTreeLeaves(treeId, 20, 0)
      setLeaves(leavesData)
      setHasMore(leavesData.length === 20)

      // Load tree stats
      const stats = await getTreeStats(treeId)
      setTreeStats(stats)

    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreLeaves = async () => {
    if (!hasMore || isLoading) return

    const newOffset = offset + 20
    const newLeaves = await getTreeLeaves(treeId, 20, newOffset)
    
    if (newLeaves.length > 0) {
      setLeaves(prev => [...prev, ...newLeaves])
      setOffset(newOffset)
      setHasMore(newLeaves.length === 20)
    } else {
      setHasMore(false)
    }
  }

  const handleReaction = async (leafId: string, reactionType: ReactionType) => {
    const success = await addLeafReaction(leafId, reactionType)
    if (success) {
      // Refresh the specific leaf or update locally
      await refreshLeaf(leafId)
    }
  }

  const handleComment = async (leafId: string, comment: string) => {
    const success = await addLeafComment(leafId, comment)
    if (success) {
      await refreshLeaf(leafId)
    }
  }

  const handleShare = async (leafId: string, branchIds: string[]) => {
    const success = await shareLeafWithBranches(leafId, branchIds)
    if (success) {
      await refreshLeaf(leafId)
    }
  }

  const refreshLeaf = async (leafId: string) => {
    try {
      const { data, error } = await supabase
        .from('leaves_with_details')
        .select('*')
        .eq('id', leafId)
        .single()

      if (!error && data) {
        setLeaves(prev => prev.map(leaf => 
          leaf.id === leafId ? data : leaf
        ))
      }
    } catch (error) {
      console.error('Error refreshing leaf:', error)
    }
  }

  const handleCreateLeaf = async (leafData: any) => {
    try {
      const newLeaf = await createLeaf({
        ...leafData,
        branch_id: branches[0]?.id // TODO: Let user select branch
      })

      if (newLeaf) {
        // Refresh leaves list
        const updatedLeaves = await getTreeLeaves(treeId, 20, 0)
        setLeaves(updatedLeaves)
        setShowCreator(false)

        // Update stats
        const updatedStats = await getTreeStats(treeId)
        setTreeStats(updatedStats)
      }
    } catch (error) {
      console.error('Error creating leaf:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🌿</div>
          <p className="text-gray-600">Loading {tree?.name || 'tree'} memories...</p>
        </div>
      </div>
    )
  }

  if (!tree) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌳</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Tree not found</h1>
          <p className="text-gray-600">This memory tree doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <span>{tree.name}'s Memory Tree</span>
                  <span className="text-3xl">🌳</span>
                </h1>
                <p className="text-gray-600">{tree.description}</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>New Leaf</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-6">
        <TreeTimeline
          treeId={treeId}
          treeName={tree.name}
          leaves={leaves}
          milestones={milestones}
          onReaction={handleReaction}
          onShare={handleShare}
          onComment={handleComment}
          onLoadMore={loadMoreLeaves}
          hasMore={hasMore}
          isLoading={isLoading}
        />
      </div>

      {/* Leaf Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <LeafCreator
              branchId={branches[0]?.id || ''}
              branchName={branches[0]?.name || ''}
              treeName={tree.name}
              childAge={undefined} // TODO: Calculate from tree/child data
              milestones={milestones}
              onSave={handleCreateLeaf}
              onCancel={() => setShowCreator(false)}
            />
          </div>
        </div>
      )}

      {/* Leaf Viewer Modal */}
      {viewerIndex !== null && (
        <LeafViewer
          leaves={leaves}
          initialIndex={viewerIndex}
          onReaction={handleReaction}
          onShare={handleShare}
          onComment={handleComment}
          onClose={() => setViewerIndex(null)}
          onLoadMore={hasMore ? loadMoreLeaves : undefined}
          hasMore={hasMore}
        />
      )}

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setShowCreator(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center text-2xl md:hidden"
      >
        +
      </button>
    </div>
  )
}