'use client'

import React, { useState, useEffect } from 'react'
import { getUserUnassignedLeaves, getUserAssignmentStats } from '@/lib/leaf-assignments'
import { getUserBranches } from '@/lib/branches'
import { UnassignedLeaf } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import DraggableMasonryGrid from './DraggableMasonryGrid'
import FloatingActionButton from './FloatingActionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, ArrowRight, Sparkles, MapPin } from 'lucide-react'
import '../../styles/masonry-grid.css'

interface PinterestInboxPanelProps {
  userId: string
  onLeafAssigned?: (leafId: string, branchIds: string[]) => void
  onCreateContent?: (type: 'photo' | 'video' | 'audio' | 'text' | 'milestone') => void
  incomingMemoryId?: string | null
  onMemoryPositionCalculated?: (rect: DOMRect) => void
}

export function PinterestInboxPanel({ 
  userId, 
  onLeafAssigned, 
  onCreateContent,
  incomingMemoryId,
  onMemoryPositionCalculated
}: PinterestInboxPanelProps) {
  const [leaves, setLeaves] = useState<UnassignedLeaf[]>([])
  const [branches, setBranches] = useState<BranchWithDetails[]>([])
  const [stats, setStats] = useState({
    totalLeaves: 0,
    assignedLeaves: 0,
    unassignedLeaves: 0,
    multiAssignedLeaves: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [userId, refreshKey])

  const loadData = async () => {
    try {
      setLoading(true)
      const [leavesResult, branchesResult, statsResult] = await Promise.all([
        getUserUnassignedLeaves(userId),
        getUserBranches(userId),
        getUserAssignmentStats(userId)
      ])
      
      setLeaves(leavesResult)
      setBranches(branchesResult)
      setStats(statsResult)
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load unassigned memories",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleLeafAssigned = (leafId: string, branchIds: string[]) => {
    // Update local state to remove the assigned leaf
    setLeaves(prev => prev.filter(leaf => leaf.id !== leafId))
    
    // Update stats
    setStats(prev => ({
      ...prev,
      unassignedLeaves: prev.unassignedLeaves - 1,
      assignedLeaves: branchIds.length === 1 ? prev.assignedLeaves + 1 : prev.assignedLeaves,
      multiAssignedLeaves: branchIds.length > 1 ? prev.multiAssignedLeaves + 1 : prev.multiAssignedLeaves
    }))

    onLeafAssigned?.(leafId, branchIds)
  }

  const handleCreateContent = (type: 'photo' | 'video' | 'audio' | 'text' | 'milestone') => {
    onCreateContent?.(type)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your memories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header Section */}
      <div className="flex-shrink-0 space-y-4 pb-6">
        {/* Email-to-Memory Info Bubble */}
        <div className="relative">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-4 mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Email-to-Memory Magic
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Send photos and memories directly to your inbox:
              </p>
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <code className="bg-white/80 px-2 py-1 rounded text-xs font-mono text-blue-800 font-medium">
                  u-{userId}@colinrodrigues.com
                </code>
                <ArrowRight className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Instantly appears here!</span>
              </div>
            </div>
          </div>
          {/* Small bubble tail */}
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white/80 rotate-45 border-r border-b border-white/30"></div>
        </div>


        {/* View Title */}
        {leaves.length > 0 && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your Memory Collection</h2>
              <p className="text-sm text-gray-600">
                Discover and organize your precious family moments
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Pinterest Grid */}
      <div className="flex-1 min-h-0">
        <DraggableMasonryGrid
          leaves={leaves}
          branches={branches}
          userId={userId}
          onLeafAssigned={handleLeafAssigned}
          onRefresh={handleRefresh}
          loading={loading}
          incomingMemoryId={incomingMemoryId}
          onMemoryPositionCalculated={onMemoryPositionCalculated}
        />
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onCreateContent={handleCreateContent}
        disabled={false}
      />
    </div>
  )
}