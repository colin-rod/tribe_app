/**
 * Memory Crystallization Animation Hook
 * Manages the state and coordination for the memory crystallization animation
 * where a saved memory transitions from the form to the grid
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { useAnimationControls } from 'framer-motion'

export type CrystallizationState = 'idle' | 'preparing' | 'transforming' | 'flying' | 'integrating' | 'complete'

export interface MemoryPreview {
  id: string
  content: string
  mediaFiles: File[]
  tags: string[]
  leafType: string
  confidence: string
}

export interface CrystallizationCoordinates {
  form: { x: number; y: number; width: number; height: number }
  grid: { x: number; y: number; width: number; height: number }
}

interface UseMemoryCrystallizationReturn {
  // State
  state: CrystallizationState
  memoryPreview: MemoryPreview | null
  coordinates: CrystallizationCoordinates | null
  tempMemoryId: string | null
  
  // Controls
  formControls: ReturnType<typeof useAnimationControls>
  portalControls: ReturnType<typeof useAnimationControls>
  gridControls: ReturnType<typeof useAnimationControls>
  
  // Actions
  startCrystallization: (preview: MemoryPreview, formRect: DOMRect) => void
  setGridPosition: (gridRect: DOMRect) => void
  completeCrystallization: () => void
  resetCrystallization: () => void
  
  // Callbacks
  onPhaseComplete: (phase: CrystallizationState) => void
}

export function useMemoryCrystallization(): UseMemoryCrystallizationReturn {
  const [state, setState] = useState<CrystallizationState>('idle')
  const [memoryPreview, setMemoryPreview] = useState<MemoryPreview | null>(null)
  const [coordinates, setCoordinates] = useState<CrystallizationCoordinates | null>(null)
  const [tempMemoryId, setTempMemoryId] = useState<string | null>(null)
  
  // Animation controls for different phases
  const formControls = useAnimationControls()
  const portalControls = useAnimationControls()
  const gridControls = useAnimationControls()
  
  // Refs for cleanup
  const timeoutRefs = useRef<NodeJS.Timeout[]>([])

  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout)
    timeoutRefs.current = []
  }, [])

  const startCrystallization = useCallback((preview: MemoryPreview, formRect: DOMRect) => {
    const id = `temp-memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    setTempMemoryId(id)
    setMemoryPreview(preview)
    setCoordinates(prev => ({
      ...prev,
      form: {
        x: formRect.x,
        y: formRect.y,
        width: formRect.width,
        height: formRect.height
      }
    }))
    
    setState('preparing')
  }, [])

  const setGridPosition = useCallback((gridRect: DOMRect) => {
    setCoordinates(prev => ({
      ...prev!,
      grid: {
        x: gridRect.x,
        y: gridRect.y,
        width: gridRect.width,
        height: gridRect.height
      }
    }))
  }, [])

  const onPhaseComplete = useCallback((phase: CrystallizationState) => {
    setState(phase)
    
    // Auto-progress through phases with appropriate timing
    const timeout = setTimeout(() => {
      switch (phase) {
        case 'preparing':
          setState('transforming')
          break
        case 'transforming':
          setState('flying')
          break
        case 'flying':
          setState('integrating')
          break
        case 'integrating':
          setState('complete')
          break
      }
    }, getPhaseDelay(phase))
    
    timeoutRefs.current.push(timeout)
  }, [])

  const completeCrystallization = useCallback(() => {
    setState('complete')
    
    // Auto-reset after completion
    const timeout = setTimeout(() => {
      resetCrystallization()
    }, 500)
    
    timeoutRefs.current.push(timeout)
  }, [])

  const resetCrystallization = useCallback(() => {
    clearTimeouts()
    setState('idle')
    setMemoryPreview(null)
    setCoordinates(null)
    setTempMemoryId(null)
    
    // Reset all animation controls
    formControls.stop()
    portalControls.stop()
    gridControls.stop()
  }, [clearTimeouts, formControls, portalControls, gridControls])

  return {
    // State
    state,
    memoryPreview,
    coordinates,
    tempMemoryId,
    
    // Controls
    formControls,
    portalControls,
    gridControls,
    
    // Actions
    startCrystallization,
    setGridPosition,
    completeCrystallization,
    resetCrystallization,
    
    // Callbacks
    onPhaseComplete
  }
}

/**
 * Get delay timing for each animation phase
 */
function getPhaseDelay(phase: CrystallizationState): number {
  switch (phase) {
    case 'preparing': return 100    // Quick setup
    case 'transforming': return 400 // Form transformation
    case 'flying': return 800       // Portal flight
    case 'integrating': return 600  // Grid integration
    default: return 0
  }
}

/**
 * Generate memory preview from form data
 */
export function createMemoryPreview(
  content: string,
  mediaFiles: File[],
  tags: string[],
  leafType: string,
  confidence: string
): MemoryPreview {
  return {
    id: `preview-${Date.now()}`,
    content,
    mediaFiles: [...mediaFiles],
    tags: [...tags],
    leafType,
    confidence
  }
}

/**
 * Spring animation configurations for different phases
 */
export const CRYSTALLIZATION_SPRINGS = {
  transform: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 200,
    mass: 0.8
  },
  flight: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 300,
    mass: 0.6
  },
  integration: {
    type: 'spring' as const,
    damping: 30,
    stiffness: 400,
    mass: 0.4
  }
}