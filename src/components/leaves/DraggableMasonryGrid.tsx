'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UnassignedLeaf, LeafAssignmentResult } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { useMasonryLayout, useContainerResize } from '@/hooks/useMasonryLayout'
import { assignLeafToBranches } from '@/lib/leaf-assignments'
import { useToast } from '@/hooks/use-toast'
import DraggableLeafCard from './DraggableLeafCard'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { Search, Filter, ArrowUp } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'

interface DraggableMasonryGridProps {
  leaves: UnassignedLeaf[]
  branches: BranchWithDetails[]
  userId: string
  onLeafAssigned?: (leafId: string, branchIds: string[]) => void
  onRefresh?: () => void
  loading?: boolean
  incomingMemoryId?: string | null
  onMemoryPositionCalculated?: (rect: DOMRect) => void
}

type FilterType = 'all' | 'photo' | 'video' | 'audio' | 'text' | 'milestone'
type SortType = 'newest' | 'oldest' | 'type' | 'author'

export default function DraggableMasonryGrid({ 
  leaves, 
  branches, 
  userId, 
  onLeafAssigned,
  onRefresh,
  loading = false,
  incomingMemoryId,
  onMemoryPositionCalculated
}: DraggableMasonryGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [assigningLeaves, setAssigningLeaves] = useState<Set<string>>(new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [highlightedLeafId, setHighlightedLeafId] = useState<string | null>(null)
  
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

  // Effect for incoming memory animation
  useEffect(() => {
    if (incomingMemoryId && leaves.length > 0) {
      // Find the first leaf position to calculate where incoming memory should land
      const firstLeaf = filteredAndSortedLeaves[0]
      if (firstLeaf && containerRef.current) {
        const firstLeafElement = containerRef.current.querySelector(`[data-leaf-id="${firstLeaf.id}"]`)
        if (firstLeafElement) {
          const rect = firstLeafElement.getBoundingClientRect()
          onMemoryPositionCalculated?.(rect)
        }
      }
      
      // Set highlight for the incoming memory
      setHighlightedLeafId(incomingMemoryId)
      
      // Remove highlight after animation
      const timeout = setTimeout(() => {
        setHighlightedLeafId(null)
      }, 2000)
      
      return () => clearTimeout(timeout)
    }
  }, [incomingMemoryId, leaves, filteredAndSortedLeaves, onMemoryPositionCalculated])

  const { layout, positions, containerHeight, registerItemRef, recalculate } = useMasonryLayout(
    filteredAndSortedLeaves,
    width,
    280, // minColumnWidth
    16   // gap
  )

  // Handle leaf assignment via drag-and-drop
  const handleLeafDrop = useCallback(async (leafId: string, branchIds: string[]) => {
    if (branchIds.length === 0) return

    setAssigningLeaves(prev => new Set([...prev, leafId]))
    
    try {
      await assignLeafToBranches(leafId, branchIds)
      
      onLeafAssigned?.(leafId, branchIds)
      
      toast({
        title: "Memory organized!",
        description: `Successfully added to ${branchIds.length} branch${branchIds.length > 1 ? 'es' : ''}`,
      })
      
    } catch (error) {
      console.error('Failed to assign leaf:', error)
      toast({
        title: "Assignment failed",
        description: "Could not organize this memory. Please try again.",
        variant: "destructive"
      })
    } finally {
      setAssigningLeaves(prev => {
        const updated = new Set(prev)
        updated.delete(leafId)
        return updated
      })
    }
  }, [onLeafAssigned, toast])

  // Scroll to top handler
  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Track scroll position for scroll-to-top button
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 800)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [containerRef])

  if (loading && leaves.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-leaf-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your memories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">

      {/* Masonry Grid */}
      <div className="flex-1 relative">
        {filteredAndSortedLeaves.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No matching memories" : "No memories yet"}
            description={searchQuery ? "Try adjusting your search terms or filters" : "Your memories will appear here once you add them"}
            icon="leaf"
          />
        ) : (
          <div 
            ref={containerRef}
            className="h-full overflow-auto overscroll-contain"
            style={{ scrollbarGutter: 'stable' }}
          >
            <motion.div
              className="relative masonry-container"
              style={{ height: containerHeight }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <AnimatePresence mode="popLayout">
                {filteredAndSortedLeaves.map((leaf, index) => {
                  const position = positions.get(leaf.id)
                  if (!position) return null

                  const isHighlighted = highlightedLeafId === leaf.id
                  
                  return (
                    <motion.div
                      key={leaf.id}
                      ref={(el) => registerItemRef(leaf.id, el)}
                      className="absolute masonry-item"
                      data-leaf-id={leaf.id}
                      style={{
                        left: position.x,
                        top: position.y,
                        width: position.width,
                        height: 'auto'
                      }}
                      initial={{ 
                        opacity: 0, 
                        scale: 0.8,
                        filter: 'blur(2px)'
                      }}
                      animate={{ 
                        opacity: 1, 
                        scale: isHighlighted ? [1, 1.08, 1.02, 1] : 1,
                        filter: 'blur(0px)',
                        boxShadow: isHighlighted 
                          ? [
                              '0 0 0 rgba(34, 197, 94, 0)',
                              '0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.4)',
                              '0 0 15px rgba(34, 197, 94, 0.3)',
                              '0 4px 20px rgba(0, 0, 0, 0.1)'
                            ]
                          : '0 4px 20px rgba(0, 0, 0, 0.1)'
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        duration: isHighlighted ? 3.0 : 0.3,
                        delay: Math.min(index * 0.05, 1),
                        type: isHighlighted ? 'spring' : 'tween',
                        stiffness: isHighlighted ? 120 : undefined,
                        damping: isHighlighted ? 25 : undefined,
                        ease: isHighlighted ? "easeOut" : "easeInOut"
                      }}
                      layout
                    >
                      <DraggableLeafCard
                        leaf={leaf}
                        branches={branches}
                        isSelected={false}
                        isAssigning={assigningLeaves.has(leaf.id)}
                        onAssign={(leafId, branchIds) => handleLeafDrop(leafId, branchIds)}
                        onSelect={(leafId) => {
                          // Memory selection handled by parent component
                        }}
                      />
                      
                      {/* Enhanced memory highlight effects */}
                      {isHighlighted && (
                        <>
                          {/* Primary glow overlay */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none rounded-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ 
                              opacity: [0, 0.8, 0.4, 0.1, 0],
                              scale: [1, 1.02, 1.01, 1]
                            }}
                            transition={{ 
                              duration: 4.0,
                              ease: "easeOut",
                              times: [0, 0.2, 0.5, 0.8, 1]
                            }}
                            style={{
                              background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 40%, transparent 70%)',
                              borderRadius: 'inherit'
                            }}
                          />
                          
                          {/* Animated border highlight */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none rounded-2xl border-2"
                            initial={{ 
                              borderColor: 'rgba(34, 197, 94, 0)',
                              opacity: 0
                            }}
                            animate={{ 
                              borderColor: [
                                'rgba(34, 197, 94, 0)',
                                'rgba(34, 197, 94, 0.9)',
                                'rgba(34, 197, 94, 0.6)',
                                'rgba(34, 197, 94, 0.3)',
                                'rgba(34, 197, 94, 0)'
                              ],
                              opacity: [0, 1, 0.8, 0.4, 0]
                            }}
                            transition={{ 
                              duration: 4.0,
                              ease: "easeOut",
                              times: [0, 0.15, 0.4, 0.75, 1]
                            }}
                          />
                          
                          {/* Success pulse effect */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none rounded-2xl"
                            initial={{ opacity: 0, scale: 1 }}
                            animate={{ 
                              opacity: [0, 0.6, 0.3, 0],
                              scale: [1, 1.03, 1.015, 1]
                            }}
                            transition={{ 
                              duration: 2.5,
                              ease: "easeOut",
                              times: [0, 0.3, 0.7, 1]
                            }}
                            style={{
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(74, 222, 128, 0.1) 50%, rgba(34, 197, 94, 0.05) 100%)',
                              borderRadius: 'inherit'
                            }}
                          />
                        </>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* Scroll to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              className="fixed bottom-24 right-24 bg-white border border-gray-300 hover:border-gray-400 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow z-40"
              onClick={scrollToTop}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowUp className="w-5 h-5 text-gray-700" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}