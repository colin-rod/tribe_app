/**
 * Memory Crystallization Portal
 * Handles the cross-component animation of memories flying from form to grid
 * Uses React Portal + Framer Motion layoutId for seamless transitions
 */

'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { MemoryPreview, CrystallizationCoordinates, CRYSTALLIZATION_SPRINGS } from '@/hooks/useMemoryCrystallization'
import { Icon } from '@/components/ui/IconLibrary'
import { getLeafTypeIcon } from '@/lib/leaf-type-detection'
import { isMilestoneTag, getMilestoneTagDisplayName } from '@/lib/milestone-tags'

interface MemoryCrystallizationPortalProps {
  isVisible: boolean
  memoryPreview: MemoryPreview | null
  coordinates: CrystallizationCoordinates | null
  tempMemoryId: string | null
  onAnimationComplete?: () => void
}

export default function MemoryCrystallizationPortal({
  isVisible,
  memoryPreview,
  coordinates,
  tempMemoryId,
  onAnimationComplete
}: MemoryCrystallizationPortalProps) {
  if (!isVisible || !memoryPreview || !coordinates || !tempMemoryId) {
    return null
  }

  const portalContent = (
    <AnimatePresence
      mode="wait"
      onExitComplete={onAnimationComplete}
    >
      {isVisible && (
        <motion.div
          key={tempMemoryId}
          layoutId={tempMemoryId}
          className="fixed z-[100] pointer-events-none"
          initial={{
            x: coordinates.form.x,
            y: coordinates.form.y,
            width: coordinates.form.width,
            height: coordinates.form.height,
            scale: 0.3,
            opacity: 0.8
          }}
          animate={{
            x: coordinates.grid.x,
            y: coordinates.grid.y,
            width: coordinates.grid.width,
            height: coordinates.grid.height,
            scale: 1.0,
            opacity: 1.0,
            rotate: [0, -3, 2, 0] // Subtle rotation during flight
          }}
          exit={{
            scale: 1.1,
            opacity: 0,
            filter: 'blur(2px)'
          }}
          transition={CRYSTALLIZATION_SPRINGS.flight}
          style={{
            transformOrigin: 'center center'
          }}
        >
          <MemoryCard memoryPreview={memoryPreview} />
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Use portal to render outside component tree
  return typeof document !== 'undefined' 
    ? createPortal(portalContent, document.body)
    : null
}

/**
 * Memory card component that matches the final grid appearance
 */
function MemoryCard({ memoryPreview }: { memoryPreview: MemoryPreview }) {
  const hasMedia = memoryPreview.mediaFiles.length > 0
  const primaryMediaFile = memoryPreview.mediaFiles[0]
  
  return (
    <motion.div
      className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 overflow-hidden"
      whileHover={false} // Disable hover during flight
    >
      {/* Media Preview */}
      {hasMedia && primaryMediaFile && (
        <div className="relative aspect-video bg-leaf-50">
          {primaryMediaFile.type.startsWith('image/') ? (
            <div className="w-full h-full bg-gradient-to-br from-leaf-100 to-flower-100 flex items-center justify-center">
              <Icon name="image" size="lg" className="text-leaf-400" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bark-100 to-leaf-100 flex items-center justify-center">
              <Icon 
                name={primaryMediaFile.type.startsWith('video/') ? 'video' : 'mic'} 
                size="lg" 
                className="text-bark-400" 
              />
            </div>
          )}
          
          {/* Type indicator */}
          <div className="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
            <Icon 
              name={getLeafTypeIcon(memoryPreview.leafType)} 
              size="xs" 
              className="text-leaf-600" 
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {memoryPreview.content && (
          <p className="text-sm text-bark-400 mb-3 line-clamp-3">
            {memoryPreview.content}
          </p>
        )}

        {/* Tags */}
        {memoryPreview.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {memoryPreview.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${
                  isMilestoneTag(tag) 
                    ? 'bg-gradient-to-r from-flower-100 to-leaf-100 text-bark-400 border-flower-300/50' 
                    : 'bg-leaf-100 text-leaf-700 border-leaf-300/50'
                }`}
              >
                {isMilestoneTag(tag) && <Icon name="star" size="xs" className="mr-1" />}
                {getMilestoneTagDisplayName(tag)}
              </span>
            ))}
            {memoryPreview.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                +{memoryPreview.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* No content state */}
        {!memoryPreview.content && !hasMedia && (
          <div className="flex items-center justify-center py-8 text-bark-400/60">
            <Icon name="leaf" size="md" className="mr-2" />
            <span className="text-sm">New Memory</span>
          </div>
        )}
      </div>

      {/* Crystallization glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.2, repeat: 1 }}
        style={{
          background: 'radial-gradient(circle, rgba(129, 199, 132, 0.2) 0%, transparent 70%)',
          borderRadius: 'inherit'
        }}
      />
    </motion.div>
  )
}

/**
 * Memory trail effect component (optional enhancement)
 */
export function MemoryTrail({ 
  isVisible, 
  coordinates 
}: { 
  isVisible: boolean
  coordinates: CrystallizationCoordinates | null 
}) {
  if (!isVisible || !coordinates) return null

  const trailParticles = Array.from({ length: 5 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 bg-leaf-400/60 rounded-full"
      initial={{
        x: coordinates.form.x,
        y: coordinates.form.y,
        opacity: 0
      }}
      animate={{
        x: coordinates.grid.x,
        y: coordinates.grid.y,
        opacity: [0, 1, 0]
      }}
      transition={{
        duration: 0.8,
        delay: i * 0.1,
        ease: "easeOut"
      }}
    />
  ))

  return typeof document !== 'undefined' 
    ? createPortal(
        <div className="fixed inset-0 pointer-events-none z-[99]">
          {trailParticles}
        </div>,
        document.body
      )
    : null
}