import { useEffect } from 'react'
import { useAnimation } from 'framer-motion'
import { useParallax, useShakeDetection, useParticleEffect } from '@/hooks/useTactileInteractions'
import { FilterType } from './useTreeFiltering'

export interface UseTreeAnimationsProps {
  selectedTree: any
  filteredLeavesCount: number
  onFilterCycle: () => void
  onShowShakeHint?: () => void
}

export function useTreeAnimations({ 
  selectedTree, 
  filteredLeavesCount,
  onFilterCycle,
  onShowShakeHint 
}: UseTreeAnimationsProps) {
  const scrollY = useParallax()
  const createParticles = useParticleEffect()
  const headerControls = useAnimation()
  const backgroundControls = useAnimation()

  // Shake detection for filter cycling
  useShakeDetection(() => {
    if (filteredLeavesCount > 1) {
      // Trigger leaf shuffle animation and show particles
      createParticles(window.innerWidth / 2, window.innerHeight / 2, 8)
      onFilterCycle()
      
      // Show shake hint after first shake
      if (onShowShakeHint) {
        setTimeout(() => {
          onShowShakeHint()
        }, 1000)
      }
    }
  })

  // Animate tree selection
  const animateTreeSelection = () => {
    headerControls.start({
      y: -10,
      opacity: 0.8
    })
    setTimeout(() => {
      headerControls.start({
        y: 0,
        opacity: 1
      })
    }, 300)
  }

  // Parallax effect on scroll
  useEffect(() => {
    backgroundControls.start({
      y: scrollY * 0.5,
      scale: 1 + scrollY * 0.0002
    })
    headerControls.start({
      y: scrollY * 0.3
    })
  }, [scrollY, backgroundControls, headerControls])

  // Tree selection animation
  useEffect(() => {
    if (selectedTree) {
      animateTreeSelection()
    }
  }, [selectedTree])

  const createMoveParticles = (x?: number, y?: number) => {
    createParticles(
      x || window.innerWidth / 2, 
      y || 200, 
      5
    )
  }

  const animations = {
    entrance: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5 }
    },
    stagger: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  }

  return {
    scrollY,
    headerControls,
    backgroundControls,
    createMoveParticles,
    animateTreeSelection,
    animations
  }
}