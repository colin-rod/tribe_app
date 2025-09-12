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
}

export function PinterestInboxPanel({ 
  userId, 
  onLeafAssigned, 
  onCreateContent 
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
        {/* Email-to-Memory Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Email-to-Memory Magic
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  Send photos and memories directly to your inbox:
                  <code className="bg-white/60 px-2 py-1 rounded text-xs font-mono ml-1 mr-1">
                    u-{userId}@colinrodrigues.com
                  </code>
                  <ArrowRight className="w-3 h-3 inline mx-1" />
                  <span className="font-medium">Instantly appears here!</span>
                </p>
                <p className="text-xs text-blue-600">
                  Organize your memories by dragging them into your family trees and branches below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalLeaves}</div>
            <div className="text-xs text-gray-600">Total Memories</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.unassignedLeaves}</div>
            <div className="text-xs text-gray-600">To Organize</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.assignedLeaves}</div>
            <div className="text-xs text-gray-600">Organized</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.multiAssignedLeaves}</div>
            <div className="text-xs text-gray-600">Shared</div>
          </Card>
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
            <Badge variant="outline" className="text-blue-600 border-blue-300 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Pinterest Style
            </Badge>
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