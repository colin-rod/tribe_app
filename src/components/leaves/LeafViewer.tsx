'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LeafWithDetails, ReactionType } from '@/types/database'
import LeafCard from './LeafCard'

interface LeafViewerProps {
  leaves: LeafWithDetails[]
  initialIndex?: number
  onReaction: (leafId: string, reactionType: ReactionType) => void
  onShare: (leafId: string, branchIds: string[]) => void
  onComment: (leafId: string, comment: string) => void
  onClose: () => void
  onLoadMore?: () => void
  hasMore?: boolean
}

export default function LeafViewer({
  leaves,
  initialIndex = 0,
  onReaction,
  onShare,
  onComment,
  onClose,
  onLoadMore,
  hasMore = false
}: LeafViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const currentLeaf = leaves[currentIndex]
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < leaves.length - 1 || hasMore

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (autoHideTimer) clearTimeout(autoHideTimer)
    const timer = setTimeout(() => setShowControls(false), 3000)
    setAutoHideTimer(timer)
    return () => clearTimeout(timer)
  }, [currentIndex, showControls])

  // Show controls on any interaction
  const showControlsTemporary = useCallback(() => {
    setShowControls(true)
    if (autoHideTimer) clearTimeout(autoHideTimer)
    const timer = setTimeout(() => setShowControls(false), 3000)
    setAutoHideTimer(timer)
  }, [autoHideTimer])

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (canGoPrev && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex(prev => prev - 1)
      setTimeout(() => setIsTransitioning(false), 300)
      showControlsTemporary()
    }
  }, [canGoPrev, isTransitioning, showControlsTemporary])

  const goToNext = useCallback(() => {
    if (!isTransitioning) {
      if (canGoNext) {
        setIsTransitioning(true)
        if (currentIndex >= leaves.length - 1 && hasMore && onLoadMore) {
          onLoadMore()
        }
        setCurrentIndex(prev => prev + 1)
        setTimeout(() => setIsTransitioning(false), 300)
        showControlsTemporary()
      }
    }
  }, [canGoNext, isTransitioning, currentIndex, leaves.length, hasMore, onLoadMore, showControlsTemporary])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          goToNext()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [goToPrevious, goToNext, onClose])

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    setDragStart({ x: touch.clientX, y: touch.clientY })
    showControlsTemporary()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStart || !touchStartRef.current) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - dragStart.x
    const deltaY = touch.clientY - dragStart.y
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
      setDragOffset(deltaX)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragStart || !touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    
    // Determine if it's a swipe (minimum distance and primarily horizontal)
    const isSwipe = Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 2

    if (isSwipe) {
      if (deltaX > 0) {
        goToPrevious()
      } else {
        goToNext()
      }
    }

    // Reset drag state
    setDragStart(null)
    setDragOffset(0)
    touchStartRef.current = null
  }

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setDragStart({ x: e.clientX, y: e.clientY })
      showControlsTemporary()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return
    const deltaX = e.clientX - dragStart.x
    setDragOffset(deltaX)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStart) return

    const deltaX = e.clientX - dragStart.x
    
    if (Math.abs(deltaX) > 100) {
      if (deltaX > 0) {
        goToPrevious()
      } else {
        goToNext()
      }
    }

    setDragStart(null)
    setDragOffset(0)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click if it was a drag
    if (dragStart) {
      e.preventDefault()
      return
    }

    // Toggle controls on click
    showControlsTemporary()
  }

  if (!currentLeaf) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      {/* Background overlay - close on click */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Main viewer container */}
      <div 
        ref={containerRef}
        className="relative w-full h-full max-w-4xl mx-auto flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        {/* Leaf Card Container */}
        <div 
          className={`relative w-full max-w-lg mx-4 transition-transform duration-300 ${
            isTransitioning ? 'scale-95' : 'scale-100'
          }`}
          style={{ 
            transform: `translateX(${dragOffset}px)`,
            transition: dragOffset === 0 ? 'transform 0.3s ease' : 'none'
          }}
        >
          <LeafCard
            leaf={currentLeaf}
            onReaction={onReaction}
            onShare={onShare}
            onComment={onComment}
            className="pointer-events-auto"
          />
        </div>

        {/* Navigation Arrows */}
        {showControls && (
          <>
            {canGoPrev && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-opacity"
                aria-label="Previous leaf"
              >
                ←
              </button>
            )}

            {canGoNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-opacity"
                aria-label="Next leaf"
              >
                →
              </button>
            )}
          </>
        )}

        {/* Top Controls */}
        {showControls && (
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
            <div className="flex items-center space-x-4 text-white">
              <span className="bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} of {leaves.length}
                {hasMore && '+'}
              </span>
              {currentLeaf.milestone_type && (
                <span className="bg-yellow-500 bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium">
                  {currentLeaf.milestone_icon} {currentLeaf.milestone_display_name}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-opacity"
              aria-label="Close viewer"
            >
              ×
            </button>
          </div>
        )}

        {/* Bottom Progress Bar */}
        {showControls && leaves.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center space-x-2">
              {leaves.slice(0, Math.min(leaves.length, 10)).map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(index)
                    showControlsTemporary()
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white scale-125'
                      : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                  }`}
                />
              ))}
              {leaves.length > 10 && (
                <span className="text-white text-sm ml-2">
                  +{leaves.length - 10}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Swipe Hint */}
        {showControls && currentIndex === 0 && leaves.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-sm opacity-75 animate-pulse">
            ← Swipe to browse leaves →
          </div>
        )}

        {/* Loading indicator for lazy loading */}
        {currentIndex >= leaves.length - 2 && hasMore && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-sm">
            Loading more leaves... 🌿
          </div>
        )}
      </div>
    </div>
  )
}