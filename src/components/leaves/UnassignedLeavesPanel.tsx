'use client'

import { useState, useEffect } from 'react'
import { getUserUnassignedLeaves, assignLeafToBranches, getUserAssignmentStats } from '@/lib/leaf-assignments'
import { getUserBranches } from '@/lib/branches'
import { UnassignedLeaf, LeafAssignmentResult } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Leaf, Camera, Video, Mic, Flag, Hash, Calendar, User, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface UnassignedLeavesPanelProps {
  userId: string
  onLeafAssigned?: (leafId: string, branchIds: string[]) => void
}

export function UnassignedLeavesPanel({ userId, onLeafAssigned }: UnassignedLeavesPanelProps) {
  const [leaves, setLeaves] = useState<UnassignedLeaf[]>([])
  const [branches, setBranches] = useState<BranchWithDetails[]>([])
  const [stats, setStats] = useState({
    totalLeaves: 0,
    assignedLeaves: 0,
    unassignedLeaves: 0,
    multiAssignedLeaves: 0
  })
  const [loading, setLoading] = useState(true)
  const [assigningLeaves, setAssigningLeaves] = useState<Set<string>>(new Set())
  const [selectedLeaves, setSelectedLeaves] = useState<Set<string>>(new Set())
  const [bulkAssignBranches, setBulkAssignBranches] = useState<string[]>([])
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [userId])

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
        description: "Failed to load unassigned leaves",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignLeaf = async (leafId: string, branchIds: string[], primaryBranchId?: string) => {
    if (branchIds.length === 0) return

    setAssigningLeaves(prev => new Set([...prev, leafId]))
    
    try {
      const result: LeafAssignmentResult = await assignLeafToBranches(
        leafId, 
        branchIds, 
        userId, 
        primaryBranchId
      )

      if (result.success) {
        toast({
          title: "Leaf assigned",
          description: `Successfully assigned to ${branchIds.length} branch${branchIds.length > 1 ? 'es' : ''}`,
        })
        
        // Remove from unassigned list
        setLeaves(prev => prev.filter(leaf => leaf.id !== leafId))
        setStats(prev => ({
          ...prev,
          unassignedLeaves: prev.unassignedLeaves - 1,
          assignedLeaves: branchIds.length === 1 ? prev.assignedLeaves + 1 : prev.assignedLeaves,
          multiAssignedLeaves: branchIds.length > 1 ? prev.multiAssignedLeaves + 1 : prev.multiAssignedLeaves
        }))
        
        onLeafAssigned?.(leafId, branchIds)
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
      setAssigningLeaves(prev => {
        const newSet = new Set(prev)
        newSet.delete(leafId)
        return newSet
      })
    }
  }

  const handleBulkAssign = async () => {
    if (selectedLeaves.size === 0 || bulkAssignBranches.length === 0) return

    const leafIds = Array.from(selectedLeaves)
    const promises = leafIds.map(leafId => 
      handleAssignLeaf(leafId, bulkAssignBranches)
    )

    await Promise.all(promises)
    setSelectedLeaves(new Set())
    setBulkAssignBranches([])
    setShowBulkAssign(false)
  }

  const toggleLeafSelection = (leafId: string) => {
    setSelectedLeaves(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leafId)) {
        newSet.delete(leafId)
      } else {
        newSet.add(leafId)
      }
      return newSet
    })
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

  const branchOptions = branches.map(branch => ({
    value: branch.id,
    label: branch.name,
    color: branch.color
  }))

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
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalLeaves}</div>
          <div className="text-sm text-gray-600">Total Leaves</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.assignedLeaves}</div>
          <div className="text-sm text-gray-600">Assigned</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.unassignedLeaves}</div>
          <div className="text-sm text-gray-600">Unassigned</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.multiAssignedLeaves}</div>
          <div className="text-sm text-gray-600">Multi-assigned</div>
        </Card>
      </div>

      {/* Bulk Actions */}
      {leaves.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Unassigned Leaves ({leaves.length})</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkAssign(!showBulkAssign)}
                  disabled={selectedLeaves.size === 0}
                >
                  Bulk Assign ({selectedLeaves.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedLeaves.size === leaves.length) {
                      setSelectedLeaves(new Set())
                    } else {
                      setSelectedLeaves(new Set(leaves.map(leaf => leaf.id)))
                    }
                  }}
                >
                  {selectedLeaves.size === leaves.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showBulkAssign && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="text-sm font-medium">Assign {selectedLeaves.size} leaves to:</div>
                <MultiSelect
                  options={branchOptions}
                  value={bulkAssignBranches}
                  onChange={setBulkAssignBranches}
                  placeholder="Select branches..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleBulkAssign}>
                    Assign Selected
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {leaves.map((leaf) => (
                <LeafCard
                  key={leaf.id}
                  leaf={leaf}
                  branches={branches}
                  isSelected={selectedLeaves.has(leaf.id)}
                  isAssigning={assigningLeaves.has(leaf.id)}
                  onSelect={() => toggleLeafSelection(leaf.id)}
                  onAssign={handleAssignLeaf}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {leaves.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Leaf className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No unassigned leaves</h3>
            <p className="text-gray-600">All your leaves have been assigned to branches.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface LeafCardProps {
  leaf: UnassignedLeaf
  branches: BranchWithDetails[]
  isSelected: boolean
  isAssigning: boolean
  onSelect: () => void
  onAssign: (leafId: string, branchIds: string[], primaryBranchId?: string) => void
}

function LeafCard({ leaf, branches, isSelected, isAssigning, onSelect, onAssign }: LeafCardProps) {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [primaryBranch, setPrimaryBranch] = useState<string>('')

  const getLeafIcon = (leafType: string) => {
    switch (leafType) {
      case 'photo': return <Camera className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'milestone': return <Flag className="w-4 h-4" />
      default: return <Leaf className="w-4 h-4" />
    }
  }

  const branchOptions = branches.map(branch => ({
    value: branch.id,
    label: branch.name,
    color: branch.color
  }))

  const handleAssign = () => {
    if (selectedBranches.length === 0) return
    onAssign(leaf.id, selectedBranches, primaryBranch || undefined)
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1"
        />
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
            <p className="text-sm text-gray-900 line-clamp-3">{leaf.content}</p>
          )}
          
          {leaf.tags && leaf.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <div className="flex gap-1">
                {leaf.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs text-blue-600">#{tag}</span>
                ))}
                {leaf.tags.length > 3 && (
                  <span className="text-xs text-gray-500">+{leaf.tags.length - 3} more</span>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
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

      <div className="pl-8 space-y-3">
        <MultiSelect
          options={branchOptions}
          value={selectedBranches}
          onChange={setSelectedBranches}
          placeholder="Select branches to assign..."
          className="w-full"
        />
        
        {selectedBranches.length > 1 && (
          <Select value={primaryBranch} onValueChange={setPrimaryBranch}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select primary branch (optional)" />
            </SelectTrigger>
            <SelectContent>
              {selectedBranches.map(branchId => {
                const branch = branches.find(b => b.id === branchId)
                return branch ? (
                  <SelectItem key={branchId} value={branchId}>
                    {branch.name}
                  </SelectItem>
                ) : null
              })}
            </SelectContent>
          </Select>
        )}
        
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={selectedBranches.length === 0 || isAssigning}
          className="w-full"
        >
          {isAssigning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            `Assign to ${selectedBranches.length} branch${selectedBranches.length !== 1 ? 'es' : ''}`
          )}
        </Button>
      </div>
    </div>
  )
}