/**
 * Custom hook for managing inbox state and refresh logic
 * Centralizes inbox-related state management and handlers
 */

'use client'

import { useState, useCallback } from 'react'

interface UseInboxStateOptions {
  onMemoryCreated?: (memoryId: string) => void
}

export function useInboxState(options: UseInboxStateOptions = {}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [newlyCreatedMemoryId, setNewlyCreatedMemoryId] = useState<string | null>(null)

  const handleRefresh = useCallback((newMemoryId?: string) => {
    setRefreshKey(prev => prev + 1)
    
    if (newMemoryId) {
      setNewlyCreatedMemoryId(newMemoryId)
      options.onMemoryCreated?.(newMemoryId)
      
      // Clear the memory ID after highlighting timeout
      setTimeout(() => {
        setNewlyCreatedMemoryId(null)
      }, 3000)
    }
  }, [options])

  const clearHighlight = useCallback(() => {
    setNewlyCreatedMemoryId(null)
  }, [])

  return {
    refreshKey,
    newlyCreatedMemoryId,
    handleRefresh,
    clearHighlight
  }
}