'use client'

import React from 'react'
import { useTactileCard } from '@/hooks/useTactileInteractions'

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
  const { bind, springs, animated } = useTactileCard()

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
    <animated.div 
      className={classes}
      style={{
        transform: springs.rotateX.to(rx => 
          springs.rotateY.to(ry => 
            springs.scale.to(s => 
              springs.y.to(y => 
                springs.rotateZ.to(rz => 
                  `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s}) translateY(${y}px)`
                )
              )
            )
          )
        ),
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d'
      }}
      {...bind()}
      {...props}
    >
      {variant === 'bulletin' && (
        <>
          <div className="absolute -top-2 left-4 w-4 h-4 bg-ac-yellow rounded-full shadow-sm transform rotate-12"></div>
          <div className="absolute -top-1 right-6 w-3 h-3 bg-ac-coral rounded-full shadow-sm transform -rotate-45"></div>
        </>
      )}
      {children}
    </animated.div>
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