'use client'

import React, { useState, useCallback, forwardRef } from 'react'
import { UnassignedLeaf } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { Camera, Video, Mic, Flag, Hash, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import MemoryDetailPopup from './MemoryDetailPopup'
import OptimizedImage from '@/components/ui/OptimizedImage'

interface GridLeafCardProps {
  leaf: UnassignedLeaf
  branches: BranchWithDetails[]
  isSelected: boolean
  onSelect: (leafId: string) => void
  onAssign: (leafId: string, branchIds: string[]) => void
  onDelete?: (leafId: string) => void
  onUpdateContent?: (leafId: string, content: string) => void
  onUpdateTags?: (leafId: string, tags: string[]) => void
  className?: string
  style?: React.CSSProperties
}

const GridLeafCard = forwardRef<HTMLDivElement, GridLeafCardProps>(
  ({ leaf, branches, isSelected, onSelect, onAssign, onDelete, onUpdateContent, onUpdateTags, className = '', style }, ref) => {
    const [isHovered, setIsHovered] = useState(false)
    const [showDetailPopup, setShowDetailPopup] = useState(false)

    const getLeafIcon = (leafType: string) => {
      switch (leafType) {
        case 'photo': return <Camera className="w-4 h-4" />
        case 'video': return <Video className="w-4 h-4" />
        case 'audio': return <Mic className="w-4 h-4" />
        case 'milestone': return <Flag className="w-4 h-4" />
        default: return <Hash className="w-4 h-4" />
      }
    }

    const handleCardClick = useCallback(() => {
      setShowDetailPopup(true)
    }, [])

    // Determine card height based on content
    const hasMedia = leaf.media_urls && leaf.media_urls.length > 0
    const hasLongContent = leaf.content && leaf.content.length > 150
    const cardHeight = hasMedia ? 'auto' : hasLongContent ? 'auto' : 'auto'

    // Debug media URLs
    if (hasMedia && process.env.NODE_ENV === 'development') {
      console.log('Leaf with media:', {
        id: leaf.id,
        leaf_type: leaf.leaf_type,
        media_urls: leaf.media_urls,
        hasMedia,
        isEmailOrigin: leaf.content?.includes('Subject:')
      })
    }

    // Clean email content for display
    const cleanContent = leaf.content?.replace(/Subject: .+?\n\n?/g, '').replace(/\n\n\[.+ media file\(s\) attached\]/g, '').trim()
    const isEmailOrigin = leaf.content?.includes('Subject:')

    return (
      <div 
        ref={ref}
        className={`group relative ${className}`}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            onClick={handleCardClick}
          >

            {/* Media Display */}
            {hasMedia && (
              <div className="relative">
                {leaf.leaf_type === 'photo' && (
                  <div className="aspect-auto relative">
                    <OptimizedImage
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
        
        {/* Memory Detail Popup */}
        <MemoryDetailPopup
          leaf={leaf}
          branches={branches}
          isOpen={showDetailPopup}
          onClose={() => setShowDetailPopup(false)}
          onAssign={onAssign}
          onDelete={onDelete}
          onUpdateContent={onUpdateContent}
          onUpdateTags={onUpdateTags}
        />
      </div>
    )
  }
)

GridLeafCard.displayName = 'GridLeafCard'

export default GridLeafCard