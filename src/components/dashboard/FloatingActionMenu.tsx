'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, type IconName } from '@/components/ui/IconLibrary'
import { useLongPress } from '@/hooks/useLongPress'
import { SPRING_CONFIGS } from '@/lib/animations'

interface FloatingActionMenuProps {
  onCreateMemory: () => void
  onSwitchView: () => void
  currentView: 'inbox' | 'tree'
}

interface MenuItem {
  id: string
  icon: IconName
  label: string
  color: string
  action: () => void
  ariaLabel: string
}

export function FloatingActionMenu({ onCreateMemory, onSwitchView, currentView }: FloatingActionMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [longPressProgress, setLongPressProgress] = useState(0)
  const [showCompletionPulse, setShowCompletionPulse] = useState(false)

  // Improved long press handling with progress tracking
  const longPressHandlers = useLongPress({
    onLongPress: useCallback(() => {
      setShowCompletionPulse(true)
      setTimeout(() => {
        setIsExpanded(true)
        setLongPressProgress(0) // Reset progress after completion
        setShowCompletionPulse(false)
      }, 150) // Brief delay for completion effect
    }, []),
    onShortPress: useCallback(() => {
      // Short press executes primary action (create memory)
      if (!isExpanded) {
        onCreateMemory()
      }
    }, [onCreateMemory, isExpanded]),
    onProgress: useCallback((progress: number) => {
      setLongPressProgress(progress)
    }, []),
    delay: 500,
    preventDefault: false
  })

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded])

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo((): MenuItem[] => [
    {
      id: 'create',
      icon: 'leaf',
      label: 'Create Memory',
      color: 'bg-leaf-500 hover:bg-leaf-600',
      action: onCreateMemory,
      ariaLabel: 'Create new memory'
    },
    {
      id: 'switch',
      icon: currentView === 'inbox' ? 'trees' : 'mapPin',
      label: currentView === 'inbox' ? 'View Trees' : 'View Inbox',
      color: 'bg-blue-500 hover:bg-blue-600', 
      action: onSwitchView,
      ariaLabel: `Switch to ${currentView === 'inbox' ? 'trees' : 'inbox'} view`
    }
  ], [currentView, onCreateMemory, onSwitchView])

  const handleBackdropClick = useCallback(() => {
    setIsExpanded(false)
  }, [])

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
            onClick={handleBackdropClick}
            role="button"
            aria-label="Close menu"
            tabIndex={-1}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button Container */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING_CONFIGS.bouncy}
        >
          {/* Expanded Menu Items */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                className="absolute bottom-16 right-0 space-y-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_CONFIGS.bouncy}
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
                    transition={{ delay: index * 0.1, ...SPRING_CONFIGS.responsive }}
                    whileHover={{ scale: 1.05, x: -5 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={item.ariaLabel}
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
            className={`w-14 h-14 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 flex items-center justify-center ${
              isExpanded 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-leaf-600 hover:bg-leaf-700'
            }`}
            {...longPressHandlers}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              rotate: isExpanded ? 45 : 0,
              scale: longPressProgress > 0 && longPressProgress < 100 
                ? 1 + (longPressProgress / 100) * 0.08 
                : showCompletionPulse ? 1.05 : 1,
              filter: longPressProgress > 0 && longPressProgress < 100
                ? `drop-shadow(0 0 ${4 + (longPressProgress / 100) * 8}px rgba(34, 197, 94, ${0.3 + (longPressProgress / 100) * 0.4}))`
                : undefined
            }}
            transition={SPRING_CONFIGS.responsive}
            aria-label={isExpanded ? 'Close menu' : 'Create memory or long press for menu'}
            role="button"
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

          {/* Circular Progress Indicator */}
          <AnimatePresence>
            {longPressProgress > 0 && longPressProgress < 100 && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_CONFIGS.responsive}
              >
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 64 64"
                  style={{ overflow: 'visible' }}
                >
                  {/* Background circle */}
                  <circle
                    cx="32"
                    cy="32"
                    r="30"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="2"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="30"
                    fill="none"
                    stroke="rgba(34, 197, 94, 0.8)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 30}
                    initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
                    animate={{ 
                      strokeDashoffset: 2 * Math.PI * 30 * (1 - longPressProgress / 100),
                    }}
                    transition={{ 
                      strokeDashoffset: { duration: 0.1, ease: "linear" }
                    }}
                    style={{
                      filter: `drop-shadow(0 0 8px rgba(34, 197, 94, ${0.4 + (longPressProgress / 100) * 0.6}))`
                    }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion Pulse Effect */}
          <AnimatePresence>
            {showCompletionPulse && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [1, 1.3, 1.6]
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.4,
                  ease: "easeOut"
                }}
              >
                <div className="w-full h-full rounded-full border-2 border-leaf-400 bg-leaf-400/20" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tooltip */}
          <AnimatePresence>
            {!isExpanded && longPressProgress === 0 && (
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