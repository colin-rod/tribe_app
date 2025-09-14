import imageCompression from 'browser-image-compression'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('ImageProcessor')

export interface ImageMetadata {
  width: number
  height: number
  aspectRatio: number
  fileSize: number
  format: string
  exif?: {
    dateTime?: string
    camera?: string
    location?: {
      latitude: number
      longitude: number
    }
  }
}

export interface ProcessedImage {
  compressed: File
  thumbnail: File
  metadata: ImageMetadata
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

export interface ImageProcessingOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  fileType?: string
  quality?: number
  thumbnailSize?: number
  preserveExif?: boolean
}

const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  quality: 0.8,
  thumbnailSize: 300,
  preserveExif: false
}

/**
 * Process an image file with compression and thumbnail generation
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  logger.info('Starting image processing', {
    metadata: {
      fileName: file.name,
      originalSize: file.size,
      options: opts
    }
  })

  try {
    // Extract metadata first
    const metadata = await extractImageMetadata(file)
    
    // Compress the main image
    const compressed = await compressImage(file, opts)
    
    // Generate thumbnail
    const thumbnail = await generateThumbnail(file, opts.thumbnailSize!)
    
    const compressionRatio = file.size > 0 ? (file.size - compressed.size) / file.size : 0

    const result: ProcessedImage = {
      compressed,
      thumbnail,
      metadata,
      originalSize: file.size,
      compressedSize: compressed.size,
      compressionRatio
    }

    logger.info('Image processing completed', {
      metadata: {
        fileName: file.name,
        originalSize: file.size,
        compressedSize: compressed.size,
        compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
        thumbnailSize: thumbnail.size
      }
    })

    return result
  } catch (error) {
    logger.error('Image processing failed', error, {
      metadata: {
        fileName: file.name,
        fileSize: file.size
      }
    })
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Compress an image file
 */
async function compressImage(file: File, options: ImageProcessingOptions): Promise<File> {
  const compressionOptions = {
    maxSizeMB: options.maxSizeMB!,
    maxWidthOrHeight: options.maxWidthOrHeight!,
    useWebWorker: options.useWebWorker!,
    fileType: options.fileType,
    initialQuality: options.quality,
    alwaysKeepResolution: false,
    exifOrientation: 1
  }

  try {
    const compressedFile = await imageCompression(file, compressionOptions)
    
    // Ensure the compressed file has the same name (with potential type change)
    const extension = compressedFile.type.split('/')[1]
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const newName = `${baseName}.${extension}`
    
    return new File([compressedFile], newName, {
      type: compressedFile.type,
      lastModified: compressedFile.lastModified || Date.now()
    })
  } catch (error) {
    logger.error('Image compression failed', error, { metadata: { fileName: file.name } })
    throw error
  }
}

/**
 * Generate a thumbnail for an image
 */
async function generateThumbnail(file: File, size: number = 300): Promise<File> {
  try {
    const thumbnailOptions = {
      maxSizeMB: 0.1, // Very small for thumbnails
      maxWidthOrHeight: size,
      useWebWorker: true,
      quality: 0.7,
      fileType: 'image/jpeg' // Always use JPEG for thumbnails for better compression
    }

    const thumbnail = await imageCompression(file, thumbnailOptions)
    
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const thumbnailName = `${baseName}_thumb.jpg`
    
    return new File([thumbnail], thumbnailName, {
      type: 'image/jpeg',
      lastModified: thumbnail.lastModified || Date.now()
    })
  } catch (error) {
    logger.error('Thumbnail generation failed', error, { metadata: { fileName: file.name } })
    throw error
  }
}

/**
 * Extract metadata from an image file
 */
async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      const metadata: ImageMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        fileSize: file.size,
        format: file.type
      }
      
      URL.revokeObjectURL(url)
      resolve(metadata)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for metadata extraction'))
    }
    
    img.src = url
  })
}

/**
 * Batch process multiple images
 */
export async function processImages(
  files: File[],
  options: ImageProcessingOptions = {},
  onProgress?: (progress: number, currentFile: string) => void
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    if (onProgress) {
      onProgress((i / files.length) * 100, file.name)
    }
    
    try {
      const processed = await processImage(file, options)
      results.push(processed)
    } catch (error) {
      logger.error('Failed to process image in batch', error, { 
        metadata: {
          fileName: file.name,
          index: i 
        }
      })
      // Continue with other files even if one fails
    }
  }
  
  if (onProgress) {
    onProgress(100, 'Complete')
  }
  
  return results
}

/**
 * Check if a file is an image that can be processed
 */
export function isProcessableImage(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/bmp'
  ]
  
  return supportedTypes.includes(file.type)
}

/**
 * Validate image constraints
 */
export interface ImageConstraints {
  maxWidth?: number
  maxHeight?: number
  minWidth?: number
  minHeight?: number
  maxFileSize?: number // bytes
  allowedTypes?: string[]
}

export async function validateImageConstraints(
  file: File,
  constraints: ImageConstraints
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  
  // Check file type
  if (constraints.allowedTypes && !constraints.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`)
  }
  
  // Check file size
  if (constraints.maxFileSize && file.size > constraints.maxFileSize) {
    const maxSizeMB = (constraints.maxFileSize / (1024 * 1024)).toFixed(1)
    errors.push(`File size exceeds ${maxSizeMB}MB limit`)
  }
  
  // Check image dimensions
  if (isProcessableImage(file)) {
    try {
      const metadata = await extractImageMetadata(file)
      
      if (constraints.maxWidth && metadata.width > constraints.maxWidth) {
        errors.push(`Image width ${metadata.width}px exceeds maximum ${constraints.maxWidth}px`)
      }
      
      if (constraints.maxHeight && metadata.height > constraints.maxHeight) {
        errors.push(`Image height ${metadata.height}px exceeds maximum ${constraints.maxHeight}px`)
      }
      
      if (constraints.minWidth && metadata.width < constraints.minWidth) {
        errors.push(`Image width ${metadata.width}px is below minimum ${constraints.minWidth}px`)
      }
      
      if (constraints.minHeight && metadata.height < constraints.minHeight) {
        errors.push(`Image height ${metadata.height}px is below minimum ${constraints.minHeight}px`)
      }
    } catch (error) {
      errors.push('Failed to validate image dimensions')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Convert image to different format
 */
export async function convertImageFormat(
  file: File,
  targetType: 'image/jpeg' | 'image/png' | 'image/webp',
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      ctx?.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        
        if (blob) {
          const baseName = file.name.replace(/\.[^/.]+$/, '')
          const extension = targetType.split('/')[1]
          const newName = `${baseName}.${extension}`
          
          const convertedFile = new File([blob], newName, {
            type: targetType,
            lastModified: Date.now()
          })
          
          resolve(convertedFile)
        } else {
          reject(new Error('Failed to convert image format'))
        }
      }, targetType, quality)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for format conversion'))
    }
    
    img.src = url
  })
}