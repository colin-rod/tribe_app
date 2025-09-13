'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { UnassignedLeaf, LeafAssignmentResult } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { useMasonryLayout, useContainerResize, useInfiniteScroll } from '@/hooks/useMasonryLayout'
import { assignLeafToBranches, deleteUnassignedLeaf } from '@/lib/leaf-assignments'
import { useToast } from '@/hooks/use-toast'
import GridLeafCard from './GridLeafCard'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Search, Filter, Grid, List, CheckSquare, Trash2, ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from '@/components/ui/EmptyState'

interface MasonryLeafGridProps {
  leaves: UnassignedLeaf[]
  branches: BranchWithDetails[]
  userId: string
  onLeafAssigned?: (leafId: string, branchIds: string[]) => void
  onRefresh?: () => void
  loading?: boolean
}

type FilterType = 'all' | 'photo' | 'video' | 'audio' | 'text' | 'milestone'
type SortType = 'newest' | 'oldest' | 'type' | 'author'

export default function MasonryLeafGrid({ 
  leaves, 
  branches, 
  userId, 
  onLeafAssigned,
  onRefresh,
  loading = false
}: MasonryLeafGridProps) {
  const [selectedLeaves, setSelectedLeaves] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [assigningLeaves, setAssigningLeaves] = useState<Set<string>>(new Set())
  const [deletingLeaves, setDeletingLeaves] = useState<Set<string>>(new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  
  const { toast } = useToast()
  const { containerRef, width } = useContainerResize()

  // Filter and sort leaves
  const filteredAndSortedLeaves = useMemo(() => {
    let filtered = leaves

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(leaf => 
        leaf.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leaf.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        leaf.milestone_type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(leaf => leaf.leaf_type === filterType)
    }

    // Sort
    switch (sortType) {
      case 'oldest':
        return [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'type':
        return [...filtered].sort((a, b) => a.leaf_type.localeCompare(b.leaf_type))
      case 'author':
        return [...filtered].sort((a, b) => 
          (a.author_first_name || '').localeCompare(b.author_first_name || '')
        )
      case 'newest':
      default:
        return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [leaves, searchQuery, filterType, sortType])

  const { layout, positions, containerHeight, registerItemRef, recalculate } = useMasonryLayout(
    filteredAndSortedLeaves,
    width,
    280, // minColumnWidth
    16   // gap
  )

  // Handle leaf assignment
  const handleAssignLeaf = useCallback(async (leafId: string, branchIds: string[]) => {
    if (branchIds.length === 0) return

    setAssigningLeaves(prev => new Set([...prev, leafId]))
    
    try {
      const result: LeafAssignmentResult = await assignLeafToBranches(
        leafId, 
        branchIds, 
        userId
      )

      if (result.success) {
        toast({
          title: "Leaf assigned",
          description: `Successfully assigned to ${branchIds.length} branch${branchIds.length > 1 ? 'es' : ''}`,
        })
        
        // Remove from selected if it was selected
        setSelectedLeaves(prev => {
          const updated = new Set(prev)
          updated.delete(leafId)
          return updated
        })
        
        onLeafAssigned?.(leafId, branchIds)
        onRefresh?.()
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
        const updated = new Set(prev)
        updated.delete(leafId)
        return updated
      })
    }
  }, [userId, onLeafAssigned, onRefresh, toast])

  // Handle leaf deletion
  const handleDeleteLeaf = useCallback(async (leafId: string) => {
    setDeletingLeaves(prev => new Set([...prev, leafId]))
    
    try {
      const success = await deleteUnassignedLeaf(leafId, userId)

      if (success) {
        toast({
          title: "Leaf deleted",
          description: "The leaf has been permanently deleted",
        })
        
        setSelectedLeaves(prev => {
          const updated = new Set(prev)
          updated.delete(leafId)
          return updated
        })
        
        onRefresh?.()
      } else {
        toast({
          title: "Deletion failed",
          description: "Failed to delete the leaf",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setDeletingLeaves(prev => {
        const updated = new Set(prev)
        updated.delete(leafId)
        return updated
      })
    }
  }, [userId, onRefresh, toast])

  // Handle leaf selection
  const handleSelectLeaf = useCallback((leafId: string) => {
    setSelectedLeaves(prev => {
      const updated = new Set(prev)
      if (updated.has(leafId)) {
        updated.delete(leafId)
      } else {
        updated.add(leafId)
      }
      return updated
    })
  }, [])

  // Bulk operations
  const handleSelectAll = useCallback(() => {
    if (selectedLeaves.size === filteredAndSortedLeaves.length) {
      setSelectedLeaves(new Set())
    } else {
      setSelectedLeaves(new Set(filteredAndSortedLeaves.map(leaf => leaf.id)))
    }
  }, [selectedLeaves.size, filteredAndSortedLeaves])

  const handleBulkDelete = useCallback(async () => {
    if (selectedLeaves.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedLeaves.size} leaves? This action cannot be undone.`)) {
      return
    }

    const leafIds = Array.from(selectedLeaves)
    for (const leafId of leafIds) {
      await handleDeleteLeaf(leafId)
    }
    
    setSelectedLeaves(new Set())
  }, [selectedLeaves, handleDeleteLeaf])

  // Scroll to top
  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [containerRef])

  // Monitor scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setShowScrollTop(containerRef.current.scrollTop > 400)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef])

  // Recalculate layout when leaves change
  useEffect(() => {
    recalculate()
  }, [filteredAndSortedLeaves.length, recalculate])

  const filterCounts = useMemo(() => ({
    all: leaves.length,
    photo: leaves.filter(l => l.leaf_type === 'photo').length,
    video: leaves.filter(l => l.leaf_type === 'video').length,
    audio: leaves.filter(l => l.leaf_type === 'audio').length,
    text: leaves.filter(l => l.leaf_type === 'text').length,
    milestone: leaves.filter(l => l.milestone_type).length,
  }), [leaves])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your memories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 pb-4 border-b border-gray-200">
        {/* Search and Controls */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <FormInput
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Content Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(filterCounts) as [FilterType, number][]).map(([type, count]) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filterType === type
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'newest', label: 'Newest First' },
                      { key: 'oldest', label: 'Oldest First' },
                      { key: 'type', label: 'Content Type' },
                      { key: 'author', label: 'Author' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSortType(key as SortType)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          sortType === key
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection Controls */}
        {selectedLeaves.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-700">
                {selectedLeaves.size} memories selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-blue-700 border-blue-300"
              >
                {selectedLeaves.size === filteredAndSortedLeaves.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between py-3 text-sm text-gray-600">
        <span>
          Showing {filteredAndSortedLeaves.length} of {leaves.length} memories
          {layout.columns > 1 && ` in ${layout.columns} columns`}
        </span>
        {searchQuery && (
          <Badge variant="outline">
            Searching: &quot;{searchQuery}&quot;
          </Badge>
        )}
      </div>

      {/* Masonry Grid */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredAndSortedLeaves.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No memories found" : "No unassigned memories"}
            description={
              searchQuery 
                ? `Try adjusting your search or filters to find what you're looking for.`
                : "Great! All your memories have been organized into branches."
            }
            action={
              searchQuery ? (
                <Button onClick={() => setSearchQuery('')} variant="outline">
                  Clear Search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div 
            className="relative"
            style={{ height: containerHeight }}
          >
            {filteredAndSortedLeaves.map((leaf) => {
              const position = positions.get(leaf.id)
              if (!position) return null

              return (
                <GridLeafCard
                  key={leaf.id}
                  ref={(el) => registerItemRef(leaf.id, el)}
                  leaf={leaf}
                  branches={branches}
                  isSelected={selectedLeaves.has(leaf.id)}
                  onSelect={handleSelectLeaf}
                  onAssign={handleAssignLeaf}
                  onDelete={handleDeleteLeaf}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    width: position.width,
                    transition: 'all 0.3s ease-out'
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}