'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGesture } from '@use-gesture/react'
import { Icon } from '@/components/ui/IconLibrary'

interface FloatingActionMenuProps {
  onCreateLeaf: () => void
  onSwitchView: () => void
  currentView: 'inbox' | 'tree'
}

export function FloatingActionMenu({ onCreateLeaf, onSwitchView, currentView }: FloatingActionMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Gesture handling for long press
  const bind = useGesture({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onPointerDown: () => {
      // Long press detection
      const timer = setTimeout(() => {
        setIsExpanded(true)
      }, 500)
      
      return () => clearTimeout(timer)
    },
  })

  const menuItems = [
    {
      id: 'create',
      icon: 'leaf' as const,
      label: 'Create Memory',
      color: 'bg-leaf-500 hover:bg-leaf-600',
      action: onCreateLeaf
    },
    {
      id: 'switch',
      icon: currentView === 'inbox' ? 'trees' as const : 'mapPin' as const,
      label: currentView === 'inbox' ? 'View Trees' : 'View Inbox',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: onSwitchView
    },
    {
      id: 'search',
      icon: 'search' as const,
      label: 'Search Memories',
      color: 'bg-gray-500 hover:bg-gray-600',
      action: () => console.log('Search memories')
    },
    {
      id: 'filter',
      icon: 'filter' as const,
      label: 'Filter & Sort',
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => console.log('Filter memories')
    }
  ]

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button Container */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Expanded Menu Items */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                className="absolute bottom-16 right-0 space-y-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-full text-white shadow-lg ${item.color} backdrop-blur-sm`}
                    onClick={() => {
                      item.action()
                      setIsExpanded(false)
                    }}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 50, opacity: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, x: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon name={item.icon} size="sm" />
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB */}
          <motion.button
            className={`w-14 h-14 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ${
              isExpanded 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-leaf-600 hover:bg-leaf-700'
            }`}
            onClick={() => {
              if (isExpanded) {
                setIsExpanded(false)
              } else {
                onCreateLeaf()
              }
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              rotate: isExpanded ? 45 : 0,
              scale: isDragging ? 1.1 : 1
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            {...bind()}
          >
            <motion.div
              className="flex items-center justify-center w-full h-full"
              animate={{ rotate: isExpanded ? -45 : 0 }}
            >
              <Icon 
                name={isExpanded ? 'x' : 'plus'} 
                size="md" 
                className="text-white" 
              />
            </motion.div>
          </motion.button>

          {/* Long Press Indicator */}
          <AnimatePresence>
            {isDragging && !isExpanded && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/50"
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1.4, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </AnimatePresence>

          {/* Tooltip */}
          <AnimatePresence>
            {!isExpanded && (
              <motion.div
                className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ delay: 1 }}
              >
                Hold for more options
                <div className="absolute top-full right-2 w-2 h-2 bg-gray-900 transform rotate-45 -translate-y-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}