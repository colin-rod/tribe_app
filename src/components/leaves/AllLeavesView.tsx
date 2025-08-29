'use client'

import { useState, useEffect } from 'react'
import { getAllUserLeaves } from '@/lib/leaf-assignments'
import { LeafWithAssignments } from '@/types/common'
import { BranchWithDetails, LeafType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Leaf, 
  Camera, 
  Video, 
  Mic, 
  Flag, 
  Hash, 
  Calendar, 
  User, 
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  MapPin,
  Clock
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface AllLeavesViewProps {
  userId: string
  userBranches: BranchWithDetails[]
}

type FilterType = 'all' | 'assigned' | 'unassigned' | 'multi-assigned'
type LeafTypeFilter = 'all' | LeafType
type SortType = 'newest' | 'oldest' | 'type' | 'branch'

export function AllLeavesView({ userId, userBranches }: AllLeavesViewProps) {
  const [leaves, setLeaves] = useState<LeafWithAssignments[]>([])
  const [filteredLeaves, setFilteredLeaves] = useState<LeafWithAssignments[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [leafTypeFilter, setLeafTypeFilter] = useState<LeafTypeFilter>('all')
  const [sortBy, setSortBy] = useState<SortType>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    loadLeaves()
  }, [userId])

  useEffect(() => {
    applyFiltersAndSort()
  }, [leaves, filter, leafTypeFilter, sortBy, selectedBranchFilter])

  const loadLeaves = async () => {
    try {
      setLoading(true)
      const result = await getAllUserLeaves(userId, 100, 0)
      setLeaves(result)
    } catch (error) {
      toast({
        title: "Error loading leaves",
        description: "Failed to load your leaves",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...leaves]

    // Apply assignment status filter
    if (filter !== 'all') {
      filtered = filtered.filter(leaf => leaf.assignment_status === filter.replace('-', '_'))
    }

    // Apply leaf type filter
    if (leafTypeFilter !== 'all') {
      filtered = filtered.filter(leaf => leaf.leaf_type === leafTypeFilter)
    }

    // Apply branch filter
    if (selectedBranchFilter !== 'all') {
      if (selectedBranchFilter === 'unassigned') {
        filtered = filtered.filter(leaf => leaf.assignment_status === 'unassigned')
      } else {
        filtered = filtered.filter(leaf => 
          leaf.assignments.some(assignment => assignment.branch_id === selectedBranchFilter)
        )
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'type':
          return a.leaf_type.localeCompare(b.leaf_type)
        case 'branch':
          const aBranch = a.assignments[0]?.branch_name || 'Unassigned'
          const bBranch = b.assignments[0]?.branch_name || 'Unassigned'
          return aBranch.localeCompare(bBranch)
        default:
          return 0
      }
    })

    setFilteredLeaves(filtered)
  }

  const getLeafIcon = (leafType: LeafType) => {
    switch (leafType) {
      case 'photo': return <Camera className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'milestone': return <Flag className="w-4 h-4" />
      default: return <Leaf className="w-4 h-4" />
    }
  }

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-green-600 bg-green-50'
      case 'unassigned': return 'text-orange-600 bg-orange-50'
      case 'multi_assigned': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getAssignmentStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assigned'
      case 'unassigned': return 'Unassigned'
      case 'multi_assigned': return 'Multi-assigned'
      default: return 'Unknown'
    }
  }

  const stats = {
    total: leaves.length,
    assigned: leaves.filter(l => l.assignment_status === 'assigned').length,
    unassigned: leaves.filter(l => l.assignment_status === 'unassigned').length,
    multiAssigned: leaves.filter(l => l.assignment_status === 'multi_assigned').length,
    byType: leaves.reduce((acc, leaf) => {
      acc[leaf.leaf_type] = (acc[leaf.leaf_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Your Leaves</h2>
          <p className="text-gray-600">Complete timeline of all your memories</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Showing {filteredLeaves.length} of {leaves.length} leaves
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.assigned}</div>
          <div className="text-sm text-gray-600">Assigned</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
          <div className="text-sm text-gray-600">Unassigned</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.multiAssigned}</div>
          <div className="text-sm text-gray-600">Multi-assigned</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{Object.keys(stats.byType).length}</div>
          <div className="text-sm text-gray-600">Types</div>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Status
              </label>
              <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="multi-assigned">Multi-assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leaf Type
              </label>
              <Select value={leafTypeFilter} onValueChange={(value) => setLeafTypeFilter(value as LeafTypeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="photo">Photos</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="milestone">Milestones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="unassigned">Unassigned Only</SelectItem>
                  {userBranches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="type">By Type</SelectItem>
                  <SelectItem value="branch">By Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Leaves Timeline */}
      <div className="space-y-4">
        {filteredLeaves.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Eye className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leaves found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeaves.map((leaf) => (
            <LeafTimelineCard key={leaf.id} leaf={leaf} />
          ))
        )}
      </div>

      {/* Load More */}
      {leaves.length >= 100 && (
        <div className="text-center">
          <Button variant="outline" onClick={loadLeaves}>
            Load More Leaves
          </Button>
        </div>
      )}
    </div>
  )
}

interface LeafTimelineCardProps {
  leaf: LeafWithAssignments
}

function LeafTimelineCard({ leaf }: LeafTimelineCardProps) {
  const getLeafIcon = (leafType: LeafType) => {
    switch (leafType) {
      case 'photo': return <Camera className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'milestone': return <Flag className="w-4 h-4" />
      default: return <Leaf className="w-4 h-4" />
    }
  }

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-green-600 bg-green-50'
      case 'unassigned': return 'text-orange-600 bg-orange-50'
      case 'multi_assigned': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getAssignmentStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assigned'
      case 'unassigned': return 'Unassigned'
      case 'multi_assigned': return 'Multi-assigned'
      default: return 'Unknown'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Left Timeline Indicator */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              {getLeafIcon(leaf.leaf_type)}
            </div>
            <div className="w-px bg-gray-200 h-6 mt-2"></div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {leaf.leaf_type}
                </Badge>
                <Badge className={`text-xs ${getAssignmentStatusColor(leaf.assignment_status)}`}>
                  {getAssignmentStatusText(leaf.assignment_status)}
                </Badge>
                {leaf.milestone_type && (
                  <Badge variant="outline" className="text-xs">
                    {leaf.milestone_type}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {format(new Date(leaf.created_at), 'MMM d, yyyy')}
              </div>
            </div>

            {/* Content */}
            {leaf.content && (
              <p className="text-gray-900 leading-relaxed">{leaf.content}</p>
            )}

            {/* Media indicators */}
            {leaf.media_urls && leaf.media_urls.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Camera className="w-3 h-3" />
                {leaf.media_urls.length} media file{leaf.media_urls.length > 1 ? 's' : ''}
              </div>
            )}

            {/* Tags */}
            {leaf.tags && leaf.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-gray-400" />
                <div className="flex gap-1 flex-wrap">
                  {leaf.tags.map(tag => (
                    <span key={tag} className="text-xs text-blue-600">#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments */}
            {leaf.assignments && leaf.assignments.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <div className="flex gap-2 flex-wrap">
                  {leaf.assignments.map(assignment => (
                    <div key={assignment.assignment_id} className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: assignment.branch_color }}
                      />
                      <span className="text-xs text-gray-600">
                        {assignment.branch_name}
                        {assignment.is_primary && <span className="text-blue-600 ml-1">(Primary)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              Created {formatDistanceToNow(new Date(leaf.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}