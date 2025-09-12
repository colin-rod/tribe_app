// Standardized animation parameters for consistent motion across the app

export const ANIMATION_DURATIONS = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  verySlow: 1.0
} as const

export const SPRING_CONFIGS = {
  // Gentle, nature-inspired springs
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25
  },
  // Responsive interactions
  responsive: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30
  },
  // Bouncy for playful elements
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25
  },
  // Snappy for quick feedback
  snappy: {
    type: 'spring' as const,
    stiffness: 250,
    damping: 30
  }
} as const

export const SCALE_VALUES = {
  // Hover effects
  hoverScale: 1.02,
  hoverScaleSmall: 1.01,
  hoverScaleLarge: 1.05,
  // Tap effects
  tapScale: 0.98,
  tapScaleSmall: 0.995,
  // Drag effects
  dragScale: 1.05
} as const

export const MOVEMENT_VALUES = {
  // Subtle movements for hover
  hoverY: -1,
  hoverYLarge: -2,
  // Tap feedback
  tapY: 1,
  // Rotation for playful elements
  playfulRotate: 1
} as const

export const OPACITY_VALUES = {
  hidden: 0,
  visible: 1,
  faded: 0.6,
  subtle: 0.8
} as const

// Common animation combinations
export const COMMON_ANIMATIONS = {
  // Gentle hover for buttons and cards
  gentleHover: {
    whileHover: {
      y: MOVEMENT_VALUES.hoverY,
      scale: SCALE_VALUES.hoverScaleSmall,
      transition: SPRING_CONFIGS.gentle
    }
  },
  
  // Tap feedback for interactive elements
  tapFeedback: {
    whileTap: {
      scale: SCALE_VALUES.tapScale,
      y: MOVEMENT_VALUES.tapY,
      transition: SPRING_CONFIGS.snappy
    }
  },
  
  // Fade in animation
  fadeIn: {
    initial: { opacity: OPACITY_VALUES.hidden, scale: 0.95 },
    animate: { opacity: OPACITY_VALUES.visible, scale: 1 },
    transition: SPRING_CONFIGS.gentle
  },
  
  // Slide in from bottom
  slideInFromBottom: {
    initial: { opacity: OPACITY_VALUES.hidden, y: 20 },
    animate: { opacity: OPACITY_VALUES.visible, y: 0 },
    transition: SPRING_CONFIGS.responsive
  },
  
  // Drag interaction
  dragInteraction: {
    whileDrag: { scale: SCALE_VALUES.dragScale },
    transition: SPRING_CONFIGS.bouncy
  }
} as const

// Animation delays for staggered animations
export const STAGGER_DELAYS = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15
} as const

// Memory crystallization specific animations
export const CRYSTALLIZATION_ANIMATIONS = {
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
  },
  dashboardFade: {
    duration: 0.3,
    ease: "easeInOut" as const
  }
} as const