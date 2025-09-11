'use client'

import React from 'react'
import { useTactileCard } from '@/hooks/useTactileInteractions'
import { motion } from 'framer-motion'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bulletin' | 'polaroid' | 'wooden' | 'leaf'
  tactile?: boolean
}

export function Card({ 
  children, 
  className = '', 
  variant = 'default',
  tactile = true,
  ...props 
}: CardProps) {
  const { motionProps, controls, motion: motionComponent } = useTactileCard()

  const baseClasses = 'game-card relative transition-all duration-300'
  
  const variants = {
    default: 'bg-surface border-ac-brown-light rounded-3xl shadow-medium',
    bulletin: 'bg-ac-peach-light border-ac-brown border-4 rounded-2xl shadow-large transform rotate-1 before:bg-ac-brown',
    polaroid: 'bg-white border-8 border-white rounded-lg shadow-large pb-8 relative after:content-["📎"] after:absolute after:top-2 after:right-2 after:text-xl after:opacity-60',
    wooden: 'bg-ac-brown-light border-ac-brown-dark border-4 rounded-2xl shadow-wooden relative before:bg-ac-sage',
    leaf: 'bg-gradient-to-br from-ac-sage-light to-ac-peach-light border-ac-sage border-3 rounded-3xl shadow-medium leaf-decoration'
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
            className="absolute -top-2 left-4 w-4 h-4 bg-ac-yellow rounded-full shadow-sm"
            initial={{ rotate: 12 }}
            animate={{ rotate: [12, 20, 12] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -top-1 right-6 w-3 h-3 bg-ac-coral rounded-full shadow-sm"
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
      className={`px-6 py-4 border-b border-ac-brown-light bg-gradient-to-r from-ac-peach-light to-transparent ${className}`.trim()} 
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
      className={`text-lg font-semibold text-ac-brown-dark font-display flex items-center ${className}`.trim()} 
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
      className={`px-6 py-4 text-ac-brown ${className}`.trim()} 
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
      className={`px-6 py-3 bg-ac-peach-light border-t border-ac-brown-light rounded-b-3xl ${className}`.trim()} 
      {...props}
    >
      {children}
    </div>
  )
}