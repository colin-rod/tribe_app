'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  onError?: (error: any) => void
  onLoad?: () => void
}

/**
 * A component that tries Next.js optimized Image first, 
 * then falls back to regular img tag if Next.js Image fails
 */
export default function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 200,
  className = '',
  style = {},
  onError,
  onLoad
}: OptimizedImageProps) {
  const [useNextImage, setUseNextImage] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasFailed, setHasFailed] = useState(false)

  const handleNextImageError = (error: any) => {
    console.warn('Next.js Image failed, falling back to regular img:', src, error)
    setUseNextImage(false)
    setHasFailed(true)
    if (onError) onError(error)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    if (onLoad) onLoad()
  }

  const handleFallbackError = (error: any) => {
    console.error('Both Next.js Image and fallback img failed:', src, error)
    setHasFailed(true)
    setIsLoading(false)
    if (onError) onError(error)
  }

  // Loading placeholder
  if (isLoading && useNextImage) {
    return (
      <div 
        className={`bg-gray-100 animate-pulse flex items-center justify-center ${className}`}
        style={{ width, height, ...style }}
      >
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  // Failed state
  if (hasFailed && !useNextImage) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height, ...style }}
      >
        <div className="text-gray-500 text-center p-2">
          <div className="text-sm">Image unavailable</div>
          <div className="text-xs mt-1 break-all">{src}</div>
        </div>
      </div>
    )
  }

  // Use Next.js Image (optimized)
  if (useNextImage) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onError={handleNextImageError}
        onLoad={handleImageLoad}
        unoptimized={false}
      />
    )
  }

  // Fallback to regular img tag
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ width, height, ...style }}
      onError={handleFallbackError}
      onLoad={handleImageLoad}
    />
  )
}