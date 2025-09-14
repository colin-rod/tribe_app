'use client'

import { useDrag } from 'react-dnd'
import { motion } from 'framer-motion'
import { UnassignedLeaf } from '@/types/common'
import GridLeafCard from './GridLeafCard'

interface DraggableLeafCardProps {
  leaf: UnassignedLeaf
  onSelect?: (leafId: string) => void
  onAssign?: (leafId: string, branchIds: string[]) => void
  onDelete?: (leafId: string) => void
  onUpdateContent?: (leafId: string, content: string) => void
  onUpdateTags?: (leafId: string, tags: string[]) => void
  isSelected?: boolean
  showAssignmentModal?: (leafId: string) => void
  isAssigning?: boolean
  style?: React.CSSProperties
  branches?: any[]
}

export default function DraggableLeafCard({
  leaf,
  onSelect,
  onAssign,
  onDelete,
  onUpdateContent,
  onUpdateTags,
  isSelected = false,
  showAssignmentModal,
  isAssigning = false,
  style,
  branches = []
}: DraggableLeafCardProps) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'LEAF',
    item: { id: leaf.id, type: 'LEAF', leaf },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: !isAssigning
  })

  return (
    <motion.div
      ref={(node) => {
        drag(node)
        preview(node)
      }}
      style={style}
      className={`cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-105 rotate-2' : 'opacity-100'
      }`}
      whileHover={{ 
        scale: isDragging ? 1.05 : 1.02,
        rotate: isDragging ? 2 : 0,
        transition: { duration: 0.2 }
      }}
      whileDrag={{ 
        scale: 1.05,
        rotate: 5,
        zIndex: 1000,
        transition: { duration: 0.1 }
      }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        scale: isDragging ? 1.05 : 1,
        rotateZ: isDragging ? 2 : 0
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag Handle Indicator */}
      {!isDragging && (
        <motion.div
          className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </motion.div>
      )}

      {/* Dragging Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-leaf-100/30 border-2 border-dashed border-leaf-400 rounded-2xl flex items-center justify-center">
          <motion.div
            className="bg-leaf-600 text-white px-3 py-1 rounded-full text-sm font-medium"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            Drop on a branch
          </motion.div>
        </div>
      )}

      <div className="group relative">
        <GridLeafCard
          leaf={leaf}
          branches={branches}
          isSelected={isSelected}
          onSelect={onSelect || (() => {})}
          onAssign={onAssign || (() => {})}
          onDelete={onDelete}
          onUpdateContent={onUpdateContent}
          onUpdateTags={onUpdateTags}
        />
      </div>
    </motion.div>
  )
}