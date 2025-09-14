import { useState, useCallback, useRef, useEffect } from 'react'
import { UploadQueue, UploadFile, UploadResult, UploadOptions, getUploadQueue } from '@/lib/media/uploadQueue'
import { FileWithPreview } from '@/components/ui/FileUpload'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('useFileUpload')

export interface UseFileUploadOptions extends UploadOptions {
  leafId?: string
  autoUpload?: boolean
  onUploadComplete?: (results: UploadResult[]) => void
  onUploadError?: (error: string) => void
  onProgress?: (progress: number) => void
}

export interface UseFileUploadReturn {
  files: FileWithPreview[]
  uploadProgress: Record<string, number>
  uploading: boolean
  completed: boolean
  error: string | null
  
  // Actions
  addFiles: (newFiles: File[]) => void
  removeFile: (fileId: string) => void
  startUpload: () => Promise<UploadResult[]>
  pauseUpload: () => void
  resumeUpload: () => void
  cancelUpload: (fileId?: string) => void
  clearFiles: () => void
  
  // Queue stats
  getUploadStats: () => {
    pending: number
    uploading: number
    completed: number
    failed: number
    total: number
  }
  
  // Queue management
  updateLeafId: (leafId: string) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploading, setUploading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const uploadQueueRef = useRef<UploadQueue | null>(null)
  const completedUploadsRef = useRef<UploadResult[]>([])
  const fileIdMapRef = useRef<Map<string, string>>(new Map()) // FileWithPreview.id -> UploadFile.id

  // Initialize upload queue
  useEffect(() => {
    uploadQueueRef.current = getUploadQueue(options)
    
    // Set up callbacks
    uploadQueueRef.current
      .onProgress((uploadFile) => {
        setUploadProgress(prev => ({
          ...prev,
          [uploadFile.id]: uploadFile.progress
        }))
        
        // Update file status in our state
        setFiles(prev => prev.map(file => {
          const uploadFileId = fileIdMapRef.current.get(file.id)
          if (uploadFileId === uploadFile.id) {
            return {
              ...file,
              uploading: uploadFile.status === 'uploading',
              progress: uploadFile.progress,
              error: uploadFile.error
            }
          }
          return file
        }))

        // Calculate overall progress
        if (options.onProgress) {
          const allFiles = uploadQueueRef.current!.getFiles()
          const totalProgress = allFiles.length > 0 
            ? allFiles.reduce((sum, f) => sum + f.progress, 0) / allFiles.length
            : 0
          options.onProgress(totalProgress)
        }
      })
      .onComplete((result) => {
        completedUploadsRef.current.push(result)
        
        // Check if all uploads are complete
        const stats = uploadQueueRef.current!.getStats()
        const allDone = stats.pending === 0 && stats.uploading === 0 && stats.processing === 0
        
        if (allDone) {
          setUploading(false)
          setCompleted(true)
          options.onUploadComplete?.(completedUploadsRef.current)
          logger.info('All uploads completed', { 
            metadata: {
              totalFiles: completedUploadsRef.current.length,
              successful: completedUploadsRef.current.filter(r => r.success).length
            }
          })
        }
      })
      .onError((uploadFile, errorMessage) => {
        setError(errorMessage)
        options.onUploadError?.(errorMessage)
        
        logger.error('Upload failed for file', new Error(errorMessage), {
          metadata: {
            fileId: uploadFile.id,
            fileName: uploadFile.file.name
          }
        })
      })

    return () => {
      // Cleanup: revoke object URLs
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, []) // Only run once

  const addFiles = useCallback((newFiles: File[]) => {
    setError(null)
    
    // Create FileWithPreview objects
    const filesWithPreview: FileWithPreview[] = newFiles.map(file => {
      const id = crypto.randomUUID()
      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploading: false,
        progress: 0
      })
      return fileWithPreview
    })

    setFiles(prev => [...prev, ...filesWithPreview])
    
    logger.info('Files added', { metadata: { count: newFiles.length, totalFiles: files.length + newFiles.length } })

    // Auto-upload if enabled
    if (options.autoUpload && uploadQueueRef.current) {
      uploadQueueRef.current.add(newFiles, options.leafId)
      
      // Map file IDs for progress tracking
      const uploadFiles = uploadQueueRef.current.getFiles()
      const newUploadFiles = uploadFiles.slice(-newFiles.length)
      
      newUploadFiles.forEach((uploadFile, index) => {
        fileIdMapRef.current.set(filesWithPreview[index].id, uploadFile.id)
      })
      
      setUploading(true)
      setCompleted(false)
      completedUploadsRef.current = []
    }
  }, [files.length, options.autoUpload, options.leafId])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      
      // Cancel upload if in progress
      const uploadFileId = fileIdMapRef.current.get(fileId)
      if (uploadFileId && uploadQueueRef.current) {
        uploadQueueRef.current.cancel(uploadFileId)
      }
      
      fileIdMapRef.current.delete(fileId)
      return prev.filter(f => f.id !== fileId)
    })
    
    // Remove from upload progress tracking
    setUploadProgress(prev => {
      const uploadFileId = fileIdMapRef.current.get(fileId)
      if (uploadFileId) {
        const { [uploadFileId]: removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const startUpload = useCallback(async (): Promise<UploadResult[]> => {
    if (!uploadQueueRef.current || files.length === 0) {
      return []
    }

    setUploading(true)
    setCompleted(false)
    setError(null)
    completedUploadsRef.current = []

    // Convert FileWithPreview back to File objects for upload
    const filesToUpload = files.map(f => f as File)
    
    await uploadQueueRef.current.add(filesToUpload, options.leafId)
    
    // Map file IDs for progress tracking
    const uploadFiles = uploadQueueRef.current.getFiles()
    const newUploadFiles = uploadFiles.slice(-files.length)
    
    newUploadFiles.forEach((uploadFile, index) => {
      fileIdMapRef.current.set(files[index].id, uploadFile.id)
    })

    return new Promise((resolve) => {
      const checkComplete = () => {
        const stats = uploadQueueRef.current!.getStats()
        if (stats.pending === 0 && stats.uploading === 0 && stats.processing === 0) {
          resolve(completedUploadsRef.current)
        } else {
          setTimeout(checkComplete, 500)
        }
      }
      checkComplete()
    })
  }, [files, options.leafId])

  const pauseUpload = useCallback(() => {
    if (uploadQueueRef.current) {
      uploadQueueRef.current.pause()
      setUploading(false)
    }
  }, [])

  const resumeUpload = useCallback(() => {
    if (uploadQueueRef.current) {
      uploadQueueRef.current.resume()
      setUploading(true)
    }
  }, [])

  const cancelUpload = useCallback((fileId?: string) => {
    if (!uploadQueueRef.current) return

    if (fileId) {
      const uploadFileId = fileIdMapRef.current.get(fileId)
      if (uploadFileId) {
        uploadQueueRef.current.cancel(uploadFileId)
      }
    } else {
      // Cancel all uploads
      files.forEach(file => {
        const uploadFileId = fileIdMapRef.current.get(file.id)
        if (uploadFileId) {
          uploadQueueRef.current!.cancel(uploadFileId)
        }
      })
      setUploading(false)
    }
  }, [files])

  const clearFiles = useCallback(() => {
    // Revoke object URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    
    // Cancel any ongoing uploads
    cancelUpload()
    
    setFiles([])
    setUploadProgress({})
    setUploading(false)
    setCompleted(false)
    setError(null)
    fileIdMapRef.current.clear()
    completedUploadsRef.current = []
  }, [files, cancelUpload])

  const getUploadStats = useCallback(() => {
    if (!uploadQueueRef.current) {
      return { pending: 0, uploading: 0, completed: 0, failed: 0, total: 0 }
    }

    const stats = uploadQueueRef.current.getStats()
    return {
      pending: stats.pending,
      uploading: stats.uploading + stats.processing,
      completed: stats.completed,
      failed: stats.error,
      total: stats.total
    }
  }, [])

  const updateLeafId = useCallback((leafId: string) => {
    if (uploadQueueRef.current) {
      uploadQueueRef.current.updateLeafId(leafId)
    }
  }, [])

  return {
    files,
    uploadProgress,
    uploading,
    completed,
    error,
    addFiles,
    removeFile,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    clearFiles,
    getUploadStats,
    updateLeafId
  }
}