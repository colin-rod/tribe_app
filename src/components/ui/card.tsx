'use client'

import React from 'react'
import { useTactileCard } from '@/hooks/useTactileInteractions'
import { motion } from 'framer-motion'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bulletin' | 'polaroid' | 'bark' | 'leaf' | 'branch' | 'wooden'
  tactile?: boolean
}

export function Card({ 
  children, 
  className = '', 
  variant = 'default',
  tactile = true,
  ...props 
}: CardProps) {
  const { motionProps, motion: motionComponent } = useTactileCard()

  const baseClasses = 'card-branch relative transition-all duration-300'
  
  const variants = {
    default: 'bg-surface border-bark-200 rounded-soft shadow-leaf-soft',
    bulletin: 'bg-flower-400 border-bark-400 border-4 rounded-leaf shadow-floating transform rotate-1',
    polaroid: 'bg-nature-white border-8 border-nature-white rounded-leaf shadow-floating pb-8 relative after:content-["📎"] after:absolute after:top-2 after:right-2 after:text-xl after:opacity-60',
    bark: 'bg-bark-200 border-bark-400 border-4 rounded-leaf shadow-bark relative',
    leaf: 'bg-gradient-to-br from-leaf-300 to-flower-400 border-leaf-500 border-3 rounded-soft shadow-leaf-soft leaf-decoration',
    branch: 'bg-leaf-100 border-leaf-500 border-3 rounded-leaf shadow-leaf-soft',
    // Legacy variant for compatibility
    wooden: 'bg-bark-200 border-bark-400 border-4 rounded-leaf shadow-bark relative'
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${className}`.trim()

  if (!tactile) {
    return (
      <div className={classes} {...props}>
        {children}
      </div>
    )
  }

  return (
    <motion.div 
      className={classes}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      {...motionProps}
      {...props}
    >
      {variant === 'bulletin' && (
        <>
          <motion.div 
            className="absolute -top-2 left-4 w-4 h-4 bg-fruit-400 rounded-full shadow-sm"
            initial={{ rotate: 12 }}
            animate={{ rotate: [12, 20, 12] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -top-1 right-6 w-3 h-3 bg-flower-400 rounded-full shadow-sm"
            initial={{ rotate: -45 }}
            animate={{ rotate: [-45, -35, -45] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {children}
    </motion.div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  decorative?: boolean
}

export function CardHeader({ children, className = '', decorative = false, ...props }: CardHeaderProps) {
  return (
    <div 
      className={`px-6 py-4 border-b border-bark-200 bg-gradient-to-r from-flower-400 to-transparent ${className}`.trim()} 
      {...props}
    >
      {decorative && <div className="absolute top-2 right-4 text-lg opacity-60">🌿</div>}
      {children}
    </div>
  )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  decorative?: boolean
}

export function CardTitle({ children, className = '', decorative = false, ...props }: CardTitleProps) {
  return (
    <h3 
      className={`text-lg font-semibold text-bark-400 font-display flex items-center ${className}`.trim()} 
      {...props}
    >
      {decorative && <span className="mr-2 text-xl">🌸</span>}
      {children}
    </h3>
  )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div 
      className={`px-6 py-4 text-bark-400 ${className}`.trim()} 
      {...props}
    >
      {children}
    </div>
  )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div 
      className={`px-6 py-3 bg-flower-400 border-t border-bark-200 rounded-b-soft ${className}`.trim()} 
      {...props}
    >
      {children}
    </div>
  )
}