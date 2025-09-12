'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/IconLibrary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface TourStep {
  id: string
  title: string
  content: string
  icon: string
  position?: 'center' | 'top' | 'bottom'
  highlight?: string
}

interface GuidedTourProps {
  steps: TourStep[]
  onComplete: () => void
  onSkip: () => void
  isVisible: boolean
}

const defaultSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your Grove! 🌳',
    content: 'Your community is like a grove of trees, where each tree represents a person and branches represent different topics or groups.',
    icon: 'trees',
    position: 'center'
  },
  {
    id: 'tree-concept',
    title: 'Understanding Trees 🌳',
    content: 'A Tree represents a person - like a child, family member, or yourself. Each person gets their own tree to organize their memories.',
    icon: 'treePine',
    position: 'center'
  },
  {
    id: 'branch-concept',
    title: 'Branches Connect Trees 🌿',
    content: 'Branches are like topics or groups that can connect multiple trees. Think "Family Vacation", "Baby\'s First Year", or "School Updates".',
    icon: 'sprout',
    position: 'center'
  },
  {
    id: 'leaf-concept',
    title: 'Leaves are Memories 🍃',
    content: 'Leaves are the actual memories - photos, videos, voice notes, and milestones. They grow on branches and make your tree flourish!',
    icon: 'leaf',
    position: 'center'
  },
  {
    id: 'sharing',
    title: 'Private & Secure 🔒',
    content: 'Everything is completely private. Only people you invite can see specific branches. Your family\'s precious moments stay safe.',
    icon: 'lock',
    position: 'center'
  }
]

export default function GuidedTour({ 
  steps = defaultSteps, 
  onComplete, 
  onSkip, 
  isVisible 
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1)
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  const currentStepData = steps[currentStep]

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-bark-400/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Tour Card */}
        <motion.div
          className="relative z-10 w-full max-w-md mx-4"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card variant="wooden" className="p-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-4 right-4 opacity-10">
              <Icon name={currentStepData.icon as any} size="3xl" className="text-leaf-500" />
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center mb-6">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep
                        ? 'bg-leaf-500'
                        : index < currentStep
                        ? 'bg-leaf-300'
                        : 'bg-bark-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-leaf-500 rounded-full flex items-center justify-center shadow-lg">
                    <Icon name={currentStepData.icon as any} size="lg" className="text-leaf-100" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-bark-400 font-display mb-4">
                  {currentStepData.title}
                </h2>

                {/* Content */}
                <p className="text-bark-300 leading-relaxed mb-8">
                  {currentStepData.content}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleSkip}
                className="text-sm text-bark-300 hover:text-bark-400 transition-colors"
              >
                Skip tour
              </button>

              <div className="flex space-x-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="bg-surface border-bark-300 text-bark-400 hover:bg-bark-50"
                  >
                    <Icon name="chevronLeft" size="xs" className="mr-1" />
                    Previous
                  </Button>
                )}

                <Button
                  variant="bark"
                  size="sm"
                  onClick={handleNext}
                  className="shadow-lg"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      Get Started
                      <Icon name="treePine" size="xs" className="ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <Icon name="chevronRight" size="xs" className="ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Floating decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0s' }}>🌸</div>
          <div className="absolute top-1/3 right-1/4 text-xl opacity-15 animate-bounce" style={{ animationDelay: '1s' }}>🦋</div>
          <div className="absolute bottom-1/3 left-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2s' }}>🌿</div>
          <div className="absolute bottom-1/4 right-1/3 text-lg opacity-30 animate-bounce" style={{ animationDelay: '1.5s' }}>🍃</div>
        </div>
      </div>
    </AnimatePresence>
  )
}

// Hook to manage tour state
export function useGuidedTour() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasSeenTour, setHasSeenTour] = useState(false)

  useEffect(() => {
    // Check if user has seen the tour before
    const seenTour = localStorage.getItem('tribe-guided-tour-completed')
    setHasSeenTour(!!seenTour)
  }, [])

  const showTour = () => {
    setIsVisible(true)
  }

  const hideTour = () => {
    setIsVisible(false)
  }

  const completeTour = () => {
    localStorage.setItem('tribe-guided-tour-completed', 'true')
    setHasSeenTour(true)
    setIsVisible(false)
  }

  const skipTour = () => {
    localStorage.setItem('tribe-guided-tour-completed', 'true')
    setHasSeenTour(true)
    setIsVisible(false)
  }

  const resetTour = () => {
    localStorage.removeItem('tribe-guided-tour-completed')
    setHasSeenTour(false)
  }

  return {
    isVisible,
    hasSeenTour,
    showTour,
    hideTour,
    completeTour,
    skipTour,
    resetTour
  }
}