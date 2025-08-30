'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, Image, Video, Music, File, AlertCircle } from 'lucide-react'
import { fileUploadSchema } from '@/lib/validation/schemas'
import { validateData } from '@/lib/validation/schemas'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('FileUpload')

export interface FileWithPreview extends File {
  id: string
  preview?: string
  error?: string
  uploading?: boolean
  progress?: number
}

export interface FileUploadProps {
  onFiles: (files: FileWithPreview[]) => void
  maxFiles?: number
  maxSize?: number // MB
  acceptedTypes?: string[]
  disabled?: boolean
  className?: string
  showPreviews?: boolean
  value?: FileWithPreview[]
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg'
]

const DEFAULT_MAX_SIZE = 10 // MB
const DEFAULT_MAX_FILES = 10

export function FileUpload({
  onFiles,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  className = '',
  showPreviews = true,
  value = []
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Use existing validation schema
    const validation = validateData(fileUploadSchema, {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      alt_text: ''
    })

    if (!validation.success) {
      return validation.errors?.[0] || 'Invalid file'
    }

    // Additional client-side checks
    if (!acceptedTypes.includes(file.type)) {
      const typeNames = acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')
      return `File type not supported. Accepted types: ${typeNames}`
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSize}MB`
    }

    return null
  }, [acceptedTypes, maxSize])

  const createFilePreview = useCallback(async (file: File): Promise<FileWithPreview> => {
    const id = crypto.randomUUID()
    const fileWithPreview: FileWithPreview = Object.assign(file, {
      id,
      error: validateFile(file)
    })

    // Generate preview for images and videos
    if (file.type.startsWith('image/')) {
      try {
        fileWithPreview.preview = URL.createObjectURL(file)
      } catch (error) {
        logger.warn('Failed to create image preview', { fileName: file.name, error })
      }
    } else if (file.type.startsWith('video/')) {
      try {
        // Create video thumbnail
        fileWithPreview.preview = URL.createObjectURL(file)
      } catch (error) {
        logger.warn('Failed to create video preview', { fileName: file.name, error })
      }
    }

    return fileWithPreview
  }, [validateFile])

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setErrors([])
    const filesArray = Array.from(fileList)
    
    // Check total file count
    if (value.length + filesArray.length > maxFiles) {
      setErrors([`Maximum ${maxFiles} files allowed`])
      return
    }

    // Process files and create previews
    const processedFiles = await Promise.all(
      filesArray.map(file => createFilePreview(file))
    )

    // Separate valid and invalid files
    const validFiles = processedFiles.filter(file => !file.error)
    const invalidFiles = processedFiles.filter(file => file.error)

    if (invalidFiles.length > 0) {
      const errorMessages = invalidFiles.map(file => `${file.name}: ${file.error}`)
      setErrors(errorMessages)
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...value, ...validFiles]
      onFiles(updatedFiles)
      logger.info('Files added successfully', { 
        count: validFiles.length, 
        totalFiles: updatedFiles.length 
      })
    }
  }, [value, maxFiles, createFilePreview, onFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragActive(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Only set inactive if we're leaving the drop zone itself
    if (!dropRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragActive(false)
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = value.filter(file => file.id !== fileId)
    
    // Clean up preview URLs to prevent memory leaks
    const fileToRemove = value.find(file => file.id === fileId)
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
    
    onFiles(updatedFiles)
    logger.info('File removed', { fileId, remainingFiles: updatedFiles.length })
  }, [value, onFiles])

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5" />
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5" />
    if (file.type.startsWith('audio/')) return <Music className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const acceptString = acceptedTypes.join(',')
  const hasFiles = value.length > 0

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${hasFiles ? 'mb-4' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptString}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`w-8 h-8 mb-2 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className={`text-sm font-medium ${isDragActive ? 'text-blue-600' : 'text-gray-600'}`}>
            {isDragActive ? 'Drop files here' : 'Drag files here or click to browse'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}
          </p>
          <p className="text-xs text-gray-500">
            Max size: {maxSize}MB per file • Max files: {maxFiles}
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-4">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center text-red-600 text-sm mb-1">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* File Previews */}
      {showPreviews && hasFiles && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((file) => (
            <div key={file.id} className="relative group">
              <div className="aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                {/* Image Preview */}
                {file.type.startsWith('image/') && file.preview && (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Video Preview */}
                {file.type.startsWith('video/') && file.preview && (
                  <div className="relative w-full h-full">
                    <video className="w-full h-full object-cover">
                      <source src={file.preview} type={file.type} />
                    </video>
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}

                {/* File Icon for non-previewable files */}
                {!file.preview && (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(file)}
                  </div>
                )}

                {/* Upload Progress */}
                {file.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-sm">
                      {file.progress ? `${Math.round(file.progress)}%` : 'Uploading...'}
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  disabled={file.uploading}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* File Info */}
              <div className="mt-1 text-xs text-gray-600 truncate">
                <p className="font-medium truncate" title={file.name}>{file.name}</p>
                <p>{formatFileSize(file.size)}</p>
                {file.error && (
                  <p className="text-red-500 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Error
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Count */}
      {hasFiles && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {value.length} of {maxFiles} files selected
        </div>
      )}
    </div>
  )
}

export default FileUpload