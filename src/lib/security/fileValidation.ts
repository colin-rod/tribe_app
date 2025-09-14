/**
 * Comprehensive file upload security validation
 * Server-side validation to complement client-side checks
 */

import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('FileValidation')

export interface FileValidationOptions {
  maxSize?: number              // Maximum file size in bytes
  allowedMimeTypes?: string[]   // Allowed MIME types
  allowedExtensions?: string[]  // Allowed file extensions
  scanForMalware?: boolean      // Enable malware scanning
  validateFileHeader?: boolean  // Validate file headers against extensions
  maxDimensions?: {             // For images
    width: number
    height: number
  }
}

export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  sanitizedFileName: string
  detectedMimeType?: string
  fileSize: number
}

// Default security configurations
export const FILE_VALIDATION_CONFIGS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp'
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'],
    validateFileHeader: true,
    maxDimensions: {
      width: 4096,
      height: 4096
    }
  },
  
  document: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedExtensions: ['.pdf', '.txt', '.doc', '.docx'],
    validateFileHeader: true
  },
  
  
  audio: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4'
    ],
    allowedExtensions: ['.mp3', '.wav', '.ogg', '.m4a'],
    validateFileHeader: true
  }
} as const

// File signature validation (magic numbers)
const FILE_SIGNATURES: Record<string, Uint8Array[]> = {
  'image/jpeg': [
    new Uint8Array([0xFF, 0xD8, 0xFF])
  ],
  'image/png': [
    new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  ],
  'image/gif': [
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ],
  'image/webp': [
    new Uint8Array([0x52, 0x49, 0x46, 0x46]) // RIFF header, need to check WEBP at offset 8
  ],
  'application/pdf': [
    new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]) // %PDF-
  ],
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File | Buffer, 
  fileName: string,
  mimeType: string,
  options: FileValidationOptions
): Promise<FileValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Convert File to Buffer if needed
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
  const fileSize = buffer.length

  logger.info('Starting file validation', {
    metadata: {
      fileName,
      mimeType,
      fileSize,
      options
    }
  })

  // Sanitize file name
  const sanitizedFileName = sanitizeFileName(fileName)
  if (sanitizedFileName !== fileName) {
    warnings.push('File name was sanitized for security')
  }

  // Size validation
  if (options.maxSize && fileSize > options.maxSize) {
    errors.push(`File size ${formatBytes(fileSize)} exceeds maximum ${formatBytes(options.maxSize)}`)
  }

  if (fileSize === 0) {
    errors.push('File is empty')
  }

  // MIME type validation
  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
    errors.push(`MIME type "${mimeType}" is not allowed`)
  }

  // Extension validation
  if (options.allowedExtensions) {
    const extension = getFileExtension(sanitizedFileName).toLowerCase()
    if (!options.allowedExtensions.includes(extension)) {
      errors.push(`File extension "${extension}" is not allowed`)
    }
  }

  // File header validation
  let detectedMimeType: string | undefined
  if (options.validateFileHeader) {
    detectedMimeType = detectMimeTypeFromHeader(buffer)
    
    if (detectedMimeType && detectedMimeType !== mimeType) {
      errors.push(`File header indicates "${detectedMimeType}" but declared as "${mimeType}"`)
    }
  }

  // Image-specific validation  
  if (mimeType.startsWith('image/') && options.maxDimensions) {
    try {
      const dimensions = await getImageDimensions(buffer, mimeType)
      if (dimensions.width > options.maxDimensions.width || dimensions.height > options.maxDimensions.height) {
        errors.push(`Image dimensions ${dimensions.width}x${dimensions.height} exceed maximum ${options.maxDimensions.width}x${options.maxDimensions.height}`)
      }
    } catch (error) {
      warnings.push('Could not validate image dimensions')
    }
  }

  // Malware scanning (placeholder for integration with external service)
  if (options.scanForMalware) {
    const malwareResult = await scanForMalware(buffer, sanitizedFileName)
    if (!malwareResult.clean) {
      errors.push('File failed malware scan')
    }
  }

  // Additional security checks
  const securityResult = performSecurityChecks(buffer, sanitizedFileName, mimeType)
  errors.push(...securityResult.errors)
  warnings.push(...securityResult.warnings)

  const result: FileValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedFileName,
    detectedMimeType,
    fileSize
  }

  logger.info('File validation completed', {
    metadata: {
      fileName: sanitizedFileName,
      valid: result.valid,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  })

  return result
}

/**
 * Sanitize file name for security
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // Replace multiple dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255) // Limit length
    || 'untitled' // Fallback
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.substring(lastDot)
}

/**
 * Detect MIME type from file header
 */
function detectMimeTypeFromHeader(buffer: Buffer): string | undefined {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length >= signature.length) {
        const header = buffer.subarray(0, signature.length)
        if (signature.every((byte, index) => header[index] === byte)) {
          // Special case for WebP - check for WEBP at offset 8
          if (mimeType === 'image/webp') {
            const webpMarker = buffer.subarray(8, 12)
            if (webpMarker.toString() === 'WEBP') {
              return mimeType
            }
          } else {
            return mimeType
          }
        }
      }
    }
  }
  return undefined
}

/**
 * Get image dimensions (basic implementation)
 */
async function getImageDimensions(buffer: Buffer, mimeType: string): Promise<{ width: number; height: number }> {
  // This is a simplified implementation
  // In production, you'd use a proper image processing library
  
  if (mimeType === 'image/png') {
    // PNG dimensions are at bytes 16-23
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return { width, height }
    }
  } else if (mimeType === 'image/jpeg') {
    // JPEG dimension parsing is more complex
    // This is a placeholder - use a proper library in production
    return { width: 1920, height: 1080 } // Placeholder
  }
  
  throw new Error('Unsupported image format for dimension detection')
}

/**
 * Malware scanning (placeholder for external service integration)
 */
async function scanForMalware(buffer: Buffer, fileName: string): Promise<{ clean: boolean; details?: string }> {
  // Placeholder for integration with malware scanning service
  // Examples: ClamAV, VirusTotal API, AWS GuardDuty, etc.
  
  logger.info('Malware scan requested', { metadata: { fileName, size: buffer.length } })
  
  // Basic checks for now
  if (buffer.length > 100 * 1024 * 1024) { // > 100MB
    return { clean: false, details: 'File too large for scanning' }
  }
  
  // Check for embedded executables or scripts
  const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1024))
  const suspiciousPatterns = [
    'MZ', // PE executable header
    '#!/bin/', // Shell script
    '<script', // JavaScript
    'eval(', // Eval function
    'document.write' // DOM manipulation
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (content.includes(pattern)) {
      return { clean: false, details: `Suspicious pattern detected: ${pattern}` }
    }
  }
  
  return { clean: true }
}

/**
 * Additional security checks
 */
function performSecurityChecks(buffer: Buffer, fileName: string, mimeType: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for zip bombs (high compression ratio)
  if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    // This is a simplified check - implement proper zip bomb detection
    if (buffer.length < 1000 && fileName.length > 100) {
      warnings.push('Potential zip bomb detected')
    }
  }
  
  // Check for polyglot files (files that are valid in multiple formats)
  const content = buffer.toString('ascii', 0, Math.min(buffer.length, 512))
  if (content.includes('<?xml') && content.includes('<script')) {
    errors.push('Potential polyglot file detected')
  }
  
  // Check for embedded metadata that could contain sensitive info
  if (mimeType.startsWith('image/') && buffer.includes(Buffer.from('Exif'))) {
    warnings.push('Image contains EXIF metadata - consider stripping')
  }
  
  return { errors, warnings }
}

/**
 * Format bytes for human readable output
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get validation config for file type
 */
export function getValidationConfig(fileType: 'image' | 'document' | 'audio'): FileValidationOptions {
  return FILE_VALIDATION_CONFIGS[fileType] as unknown as FileValidationOptions
}

/**
 * Quick file type detection from MIME type
 */
export function detectFileType(mimeType: string): 'image' | 'document' | 'audio' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document'
  return 'unknown'
}