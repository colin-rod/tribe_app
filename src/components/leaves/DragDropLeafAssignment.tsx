'use client'

import { useState, useEffect, DragEvent } from 'react'
import { getUserUnassignedLeaves, assignLeafToBranches } from '@/lib/leaf-assignments'
import { getUserBranches } from '@/lib/branches'
import { UnassignedLeaf, LeafAssignmentResult } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Leaf, Camera, Video, Mic, Flag, Hash, Calendar, User, Loader2, MousePointer, Move3D } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DragDropLeafAssignmentProps {
  userId: string
  onLeafAssigned?: (leafId: string, branchIds: string[]) => void
}

export function DragDropLeafAssignment({ userId, onLeafAssigned }: DragDropLeafAssignmentProps) {
  const [leaves, setLeaves] = useState<UnassignedLeaf[]>([])
  const [branches, setBranches] = useState<BranchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningLeaf, setAssigningLeaf] = useState<string | null>(null)
  const [draggedLeaf, setDraggedLeaf] = useState<string | null>(null)
  const [draggedOverBranch, setDraggedOverBranch] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [leavesResult, branchesResult] = await Promise.all([
        getUserUnassignedLeaves(userId),
        getUserBranches(userId)
      ])
      
      setLeaves(leavesResult)
      setBranches(branchesResult)
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load unassigned leaves",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e: DragEvent, leafId: string) => {
    setDraggedLeaf(leafId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', leafId)
  }

  const handleDragEnd = () => {
    setDraggedLeaf(null)
    setDraggedOverBranch(null)
  }

  const handleDragOver = (e: DragEvent, branchId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverBranch(branchId)
  }

  const handleDragLeave = (e: DragEvent) => {
    // Only clear if leaving the actual drop zone, not child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDraggedOverBranch(null)
    }
  }

  const handleDrop = async (e: DragEvent, branchId: string) => {
    e.preventDefault()
    const leafId = e.dataTransfer.getData('text/plain')
    
    if (!leafId || leafId === assigningLeaf) return

    setAssigningLeaf(leafId)
    setDraggedOverBranch(null)
    setDraggedLeaf(null)

    try {
      const result: LeafAssignmentResult = await assignLeafToBranches(
        leafId, 
        [branchId], 
        userId
      )

      if (result.success) {
        toast({
          title: "Leaf assigned",
          description: `Successfully assigned to ${branches.find(b => b.id === branchId)?.name}`,
        })
        
        // Remove from unassigned list
        setLeaves(prev => prev.filter(leaf => leaf.id !== leafId))
        onLeafAssigned?.(leafId, [branchId])
      } else {
        toast({
          title: "Assignment failed",
          description: result.error || "Failed to assign leaf",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setAssigningLeaf(null)
    }
  }

  const getLeafIcon = (leafType: string) => {
    switch (leafType) {
      case 'photo': return <Camera className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'milestone': return <Flag className="w-4 h-4" />
      default: return <Leaf className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Unassigned Leaves */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Move3D className="w-5 h-5" />
              Unassigned Leaves ({leaves.length})
            </CardTitle>
            <p className="text-sm text-gray-600">
              Drag leaves to branches to assign them
            </p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {leaves.length === 0 ? (
              <div className="text-center py-8">
                <Leaf className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No unassigned leaves</p>
              </div>
            ) : (
              leaves.map((leaf) => (
                <DraggableLeafCard
                  key={leaf.id}
                  leaf={leaf}
                  isDragging={draggedLeaf === leaf.id}
                  isAssigning={assigningLeaf === leaf.id}
                  onDragStart={(e) => handleDragStart(e, leaf.id)}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch Drop Zones */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Drop Zones - Branches
            </CardTitle>
            <p className="text-sm text-gray-600">
              Drop leaves here to assign them
            </p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {branches.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌳</span>
                </div>
                <p className="text-gray-600">No branches available</p>
              </div>
            ) : (
              branches.map((branch) => (
                <BranchDropZone
                  key={branch.id}
                  branch={branch}
                  isDropTarget={draggedOverBranch === branch.id}
                  isDragActive={draggedLeaf !== null}
                  onDragOver={(e) => handleDragOver(e, branch.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, branch.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface DraggableLeafCardProps {
  leaf: UnassignedLeaf
  isDragging: boolean
  isAssigning: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
}

function DraggableLeafCard({ leaf, isDragging, isAssigning, onDragStart, onDragEnd }: DraggableLeafCardProps) {
  const getLeafIcon = (leafType: string) => {
    switch (leafType) {
      case 'photo': return <Camera className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'milestone': return <Flag className="w-4 h-4" />
      default: return <Leaf className="w-4 h-4" />
    }
  }

  return (
    <div
      draggable={!isAssigning}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`border rounded-lg p-4 cursor-move transition-all ${
        isDragging 
          ? 'opacity-50 scale-95 border-blue-300 shadow-lg' 
          : isAssigning
          ? 'opacity-75 cursor-not-allowed'
          : 'hover:shadow-md border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {isAssigning ? (
          <Loader2 className="w-4 h-4 animate-spin mt-1" />
        ) : (
          <Move3D className="w-4 h-4 text-gray-400 mt-1" />
        )}
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {getLeafIcon(leaf.leaf_type)}
            <Badge variant="secondary" className="text-xs">
              {leaf.leaf_type}
            </Badge>
            {leaf.milestone_type && (
              <Badge variant="outline" className="text-xs">
                {leaf.milestone_type}
              </Badge>
            )}
          </div>
          
          {leaf.content && (
            <p className="text-sm text-gray-900 line-clamp-2">{leaf.content}</p>
          )}
          
          {leaf.tags && leaf.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <div className="flex gap-1">
                {leaf.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs text-blue-600">#{tag}</span>
                ))}
                {leaf.tags.length > 2 && (
                  <span className="text-xs text-gray-500">+{leaf.tags.length - 2}</span>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {leaf.author_first_name} {leaf.author_last_name}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(leaf.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
      
      {isAssigning && (
        <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Assigning...
        </div>
      )}
    </div>
  )
}

interface BranchDropZoneProps {
  branch: BranchWithDetails
  isDropTarget: boolean
  isDragActive: boolean
  onDragOver: (e: DragEvent) => void
  onDragLeave: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}

function BranchDropZone({ branch, isDropTarget, isDragActive, onDragOver, onDragLeave, onDrop }: BranchDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-lg p-4 transition-all ${
        isDropTarget
          ? 'border-green-400 bg-green-50 scale-105'
          : isDragActive
          ? 'border-gray-300 bg-gray-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: branch.color }}
        />
        <div className="flex-1">
          <h3 className="font-medium text-sm">{branch.name}</h3>
          {branch.description && (
            <p className="text-xs text-gray-600 line-clamp-1">{branch.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {branch.member_count} members
          </p>
        </div>
        {isDropTarget && (
          <div className="text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {isDropTarget && (
        <div className="mt-2 text-xs text-green-600 font-medium">
          Drop to assign leaf to this branch
        </div>
      )}
    </div>
  )
}