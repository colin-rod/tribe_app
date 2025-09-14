'use client'

import React, { useState, useCallback, forwardRef } from 'react'
import Image from 'next/image'
import { UnassignedLeaf } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { Camera, Video, Mic, Flag, Hash, Calendar, User, Check, X, MoreVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'

interface GridLeafCardProps {
  leaf: UnassignedLeaf
  branches: BranchWithDetails[]
  isSelected: boolean
  onSelect: (leafId: string) => void
  onAssign: (leafId: string, branchIds: string[]) => void
  onDelete?: (leafId: string) => void
  className?: string
  style?: React.CSSProperties
}

const GridLeafCard = forwardRef<HTMLDivElement, GridLeafCardProps>(
  ({ leaf, branches, isSelected, onSelect, onAssign, onDelete, className = '', style }, ref) => {
    const [isHovered, setIsHovered] = useState(false)
    const [showAssignMenu, setShowAssignMenu] = useState(false)
    const [selectedBranches, setSelectedBranches] = useState<string[]>([])
    const [showOptions, setShowOptions] = useState(false)

    const getLeafIcon = (leafType: string) => {
      switch (leafType) {
        case 'photo': return <Camera className="w-4 h-4" />
        case 'video': return <Video className="w-4 h-4" />
        case 'audio': return <Mic className="w-4 h-4" />
        case 'milestone': return <Flag className="w-4 h-4" />
        default: return <Hash className="w-4 h-4" />
      }
    }

    const handleQuickAssign = useCallback((branchId: string) => {
      onAssign(leaf.id, [branchId])
      setShowAssignMenu(false)
    }, [leaf.id, onAssign])

    const handleMultiAssign = useCallback(() => {
      if (selectedBranches.length > 0) {
        onAssign(leaf.id, selectedBranches)
        setSelectedBranches([])
        setShowAssignMenu(false)
      }
    }, [leaf.id, selectedBranches, onAssign])

    const toggleBranchSelection = useCallback((branchId: string) => {
      setSelectedBranches(prev => 
        prev.includes(branchId) 
          ? prev.filter(id => id !== branchId)
          : [...prev, branchId]
      )
    }, [])

    // Determine card height based on content
    const hasMedia = leaf.media_urls && leaf.media_urls.length > 0
    const hasLongContent = leaf.content && leaf.content.length > 150
    const cardHeight = hasMedia ? 'auto' : hasLongContent ? 'auto' : 'auto'

    // Clean email content for display
    const cleanContent = leaf.content?.replace(/Subject: .+?\n\n?/g, '').replace(/\n\n\[.+ media file\(s\) attached\]/g, '').trim()
    const isEmailOrigin = leaf.content?.includes('Subject:')

    return (
      <div 
        ref={ref}
        className={`group relative ${className}`}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setShowAssignMenu(false)
          setShowOptions(false)
        }}
      >
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Card 
            className={`overflow-hidden border-2 transition-all duration-200 cursor-pointer hover:shadow-xl ${
              isSelected 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelect(leaf.id)}
          >
            {/* Selection Overlay */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-blue-500/20 z-10 flex items-center justify-center"
                >
                  <div className="bg-blue-500 rounded-full p-2">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hover Action Overlay */}
            <AnimatePresence>
              {isHovered && !isSelected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/90 hover:bg-white text-gray-700 text-xs"
                    onClick={() => setShowAssignMenu(!showAssignMenu)}
                  >
                    Quick Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/90 hover:bg-white text-gray-700 text-xs p-2"
                    onClick={() => setShowOptions(!showOptions)}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Assign Menu */}
            <AnimatePresence>
              {showAssignMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-4 right-4 z-30 bg-white rounded-lg shadow-lg border p-3 min-w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-xs font-medium text-gray-700 mb-2">Assign to Branch:</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {branches.slice(0, 4).map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => handleQuickAssign(branch.id)}
                        className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-2"
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: branch.color }}
                        />
                        <span className="truncate">{branch.name}</span>
                      </button>
                    ))}
                    {branches.length > 4 && (
                      <div className="text-xs text-gray-500 px-2 py-1">
                        +{branches.length - 4} more branches
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <button
                      onClick={() => {
                        setShowAssignMenu(false)
                        // Could open full assignment modal here
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Multi-assign →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options Menu */}
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-4 right-4 z-30 bg-white rounded-lg shadow-lg border p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onSelect(leaf.id)}
                    className="w-full text-left text-xs px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Check className="w-3 h-3" />
                    Select
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(leaf.id)}
                      className="w-full text-left text-xs px-3 py-2 rounded hover:bg-red-50 hover:text-red-600 flex items-center gap-2 text-red-500"
                    >
                      <X className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Media Display */}
            {hasMedia && (
              <div className="relative">
                {leaf.leaf_type === 'photo' && (
                  <div className="aspect-auto relative">
                    <Image
                      src={leaf.media_urls![0]}
                      alt="Memory content"
                      width={300}
                      height={200}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '400px' }}
                    />
                    {leaf.media_urls!.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium">
                        +{leaf.media_urls!.length - 1}
                      </div>
                    )}
                  </div>
                )}
                
                {leaf.leaf_type === 'video' && (
                  <div className="aspect-video relative bg-gray-100">
                    <video 
                      className="w-full h-full object-cover"
                      poster=""
                      preload="metadata"
                    >
                      <source src={leaf.media_urls![0]} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-white/90 rounded-full p-3">
                        <Video className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                  </div>
                )}
                
                {leaf.leaf_type === 'audio' && (
                  <div className="aspect-video relative bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="bg-white rounded-full p-4 mb-2 mx-auto w-fit">
                        <Mic className="w-8 h-8 text-gray-600" />
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Audio Recording</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-3 space-y-2">
              {/* Header with type and metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getLeafIcon(leaf.leaf_type)}
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {leaf.leaf_type}
                  </Badge>
                  {isEmailOrigin && (
                    <Badge variant="outline" className="text-xs px-2 py-1 border-blue-200 text-blue-600">
                      📧 Email
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(leaf.created_at), { addSuffix: true })}
                </div>
              </div>

              {/* Milestone */}
              {leaf.milestone_type && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Flag className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">{leaf.milestone_type}</span>
                </div>
              )}

              {/* Text Content */}
              {cleanContent && (
                <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
                  {cleanContent}
                </p>
              )}

              {/* AI Caption */}
              {leaf.ai_caption && leaf.ai_caption !== leaf.content && (
                <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                  AI: {leaf.ai_caption}
                </p>
              )}

              {/* Tags */}
              {leaf.tags && leaf.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {leaf.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                  {leaf.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{leaf.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Author */}
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-100">
                <User className="w-3 h-3" />
                <span>{leaf.author_first_name} {leaf.author_last_name}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }
)

GridLeafCard.displayName = 'GridLeafCard'

export default GridLeafCard