/**
 * Custom hook for managing dashboard view navigation and gesture handling
 * Centralizes navigation state and swipe gesture logic
 */

'use client'

import { useState, useCallback } from 'react'
import { useGesture } from '@use-gesture/react'

type ViewType = 'inbox' | 'tree'

interface UseDashboardNavigationOptions {
  initialView?: ViewType
  enableSwipeNavigation?: boolean
}

export function useDashboardNavigation({
  initialView = 'inbox',
  enableSwipeNavigation = true
}: UseDashboardNavigationOptions = {}) {
  const [currentView, setCurrentView] = useState<ViewType>(initialView)

  const switchView = useCallback(() => {
    setCurrentView(prev => prev === 'inbox' ? 'tree' : 'inbox')
  }, [])

  const navigateToView = useCallback((view: ViewType) => {
    setCurrentView(view)
  }, [])

  // Gesture handling for swipe navigation
  const swipeHandlers = useGesture({
    onDrag: ({ direction: [dx], distance, cancel }) => {
      if (!enableSwipeNavigation) return
      
      if (Array.isArray(distance) ? Math.hypot(distance[0], distance[1]) > 100 : distance > 100) {
        if (dx > 0 && currentView === 'tree') {
          setCurrentView('inbox')
          cancel()
        } else if (dx < 0 && currentView === 'inbox') {
          setCurrentView('tree')
          cancel()
        }
      }
    },
  })

  return {
    currentView,
    switchView,
    navigateToView,
    swipeHandlers,
    isInboxView: currentView === 'inbox',
    isTreeView: currentView === 'tree'
  }
}