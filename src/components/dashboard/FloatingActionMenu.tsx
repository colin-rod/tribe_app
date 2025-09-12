'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/IconLibrary'
import { useLongPress } from '@/hooks/useLongPress'
import { SPRING_CONFIGS, COMMON_ANIMATIONS } from '@/lib/animations'

interface FloatingActionMenuProps {
  onCreateMemory: () => void
  onSwitchView: () => void
  currentView: 'inbox' | 'tree'
}

interface MenuItem {
  id: string
  icon: string
  label: string
  color: string
  action: () => void
  ariaLabel: string
}

export function FloatingActionMenu({ onCreateMemory, onSwitchView, currentView }: FloatingActionMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Improved long press handling
  const longPressHandlers = useLongPress({
    onLongPress: useCallback(() => {
      setIsExpanded(true)
    }, []),
    onShortPress: useCallback(() => {
      // Short press executes primary action (create memory)
      if (!isExpanded) {
        onCreateMemory()
      }
    }, [onCreateMemory, isExpanded]),
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
              rotate: isExpanded ? 45 : 0
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