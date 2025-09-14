import { supabase } from '@/lib/supabase/client'
import { processImage, isProcessableImage } from './imageProcessor'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('UploadQueue')

export interface UploadFile {
  id: string
  file: File
  leafId?: string
  progress: number
  status: 'pending' | 'processing' | 'uploading' | 'completed' | 'error' | 'paused' | 'cancelled'
  error?: string
  uploadedUrl?: string
  thumbnailUrl?: string
  retries: number
  processedFile?: File
  xhr?: XMLHttpRequest
}

export interface UploadOptions {
  maxConcurrent?: number
  maxRetries?: number
  chunkSize?: number
  autoProcess?: boolean
  processImages?: boolean
  generateThumbnails?: boolean
}

export interface UploadResult {
  id: string
  success: boolean
  url?: string
  thumbnailUrl?: string
  error?: string
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxConcurrent: 3,
  maxRetries: 3,
  chunkSize: 1024 * 1024, // 1MB chunks
  autoProcess: true,
  processImages: true,
  generateThumbnails: true
}

export class UploadQueue {
  private queue: UploadFile[] = []
  private uploading: Set<string> = new Set()
  private options: UploadOptions
  private isPaused = false
  private onProgressCallback?: (file: UploadFile) => void
  private onCompleteCallback?: (result: UploadResult) => void
  private onErrorCallback?: (file: UploadFile, error: string) => void

  constructor(options: UploadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Set callback functions
   */
  onProgress(callback: (file: UploadFile) => void) {
    this.onProgressCallback = callback
    return this
  }

  onComplete(callback: (result: UploadResult) => void) {
    this.onCompleteCallback = callback
    return this
  }

  onError(callback: (file: UploadFile, error: string) => void) {
    this.onErrorCallback = callback
    return this
  }

  /**
   * Add files to the upload queue
   */
  async add(files: File[], leafId?: string): Promise<void> {
    const newFiles: UploadFile[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      leafId,
      progress: 0,
      status: 'pending',
      retries: 0
    }))

    this.queue.push(...newFiles)
    
    logger.info('Files added to upload queue', {
      metadata: {
        count: files.length,
        leafId,
        totalQueueSize: this.queue.length
      }
    })

    // Start processing if not paused
    if (!this.isPaused) {
      this.processQueue()
    }
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    const availableSlots = this.options.maxConcurrent! - this.uploading.size
    const pendingFiles = this.queue.filter(f => f.status === 'pending').slice(0, availableSlots)

    for (const file of pendingFiles) {
      this.processFile(file)
    }
  }

  /**
   * Process a single file
   */
  private async processFile(uploadFile: UploadFile): Promise<void> {
    if (this.uploading.has(uploadFile.id)) {
      return
    }

    this.uploading.add(uploadFile.id)
    this.updateFileStatus(uploadFile, 'processing')

    try {
      // Process image if enabled and applicable
      if (this.options.processImages && isProcessableImage(uploadFile.file)) {
        logger.info('Processing image before upload', { 
          metadata: {
            fileId: uploadFile.id,
            fileName: uploadFile.file.name 
          }
        })

        const processed = await processImage(uploadFile.file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          quality: 0.8
        })

        uploadFile.processedFile = processed.compressed
        
        logger.info('Image processing completed', {
          metadata: {
            fileId: uploadFile.id,
            originalSize: processed.originalSize,
            compressedSize: processed.compressedSize,
            compressionRatio: processed.compressionRatio
          }
        })
      }

      // Start upload
      this.updateFileStatus(uploadFile, 'uploading')
      await this.uploadFile(uploadFile)

    } catch (error) {
      this.handleUploadError(uploadFile, error)
    } finally {
      this.uploading.delete(uploadFile.id)
      
      // Process next files in queue
      if (!this.isPaused) {
        this.processQueue()
      }
    }
  }

  /**
   * Upload a file to Supabase storage
   */
  private async uploadFile(uploadFile: UploadFile): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const fileToUpload = uploadFile.processedFile || uploadFile.file
    const fileExt = fileToUpload.name.split('.').pop()
    const fileName = `${uploadFile.leafId || 'temp'}_${uploadFile.id}.${fileExt}`
    const filePath = `${user.id}/${uploadFile.leafId || 'temp'}/${fileName}`

    return new Promise((resolve, reject) => {
      // Use direct XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()
      uploadFile.xhr = xhr

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          uploadFile.progress = progress
          this.onProgressCallback?.(uploadFile)
        }
      }

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
              .from('media')
              .getPublicUrl(filePath)

            uploadFile.uploadedUrl = publicUrl
            this.updateFileStatus(uploadFile, 'completed')
            
            const result: UploadResult = {
              id: uploadFile.id,
              success: true,
              url: publicUrl
            }

            this.onCompleteCallback?.(result)
            resolve()
            
            logger.info('File upload completed', {
              metadata: {
                fileId: uploadFile.id,
                fileName: uploadFile.file.name,
                url: publicUrl
              }
            })
          } catch (error) {
            reject(error)
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Network error during upload'))
      }

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out'))
      }

      // Prepare form data for Supabase storage
      const formData = new FormData()
      formData.append('file', fileToUpload)

      // Get upload URL and upload directly
      this.performSupabaseUpload(filePath, fileToUpload)
        .then(() => resolve())
        .catch(reject)
    })
  }

  /**
   * Perform the actual Supabase upload
   */
  private async performSupabaseUpload(filePath: string, file: File): Promise<void> {
    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }
  }

  /**
   * Handle upload errors with retry logic
   */
  private handleUploadError(uploadFile: UploadFile, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
    
    logger.error('Upload failed', error, {
      metadata: {
        fileId: uploadFile.id,
        fileName: uploadFile.file.name,
        retries: uploadFile.retries,
        maxRetries: this.options.maxRetries
      }
    })

    if (uploadFile.retries < this.options.maxRetries!) {
      // Retry after delay
      uploadFile.retries++
      uploadFile.status = 'pending'
      uploadFile.error = undefined
      
      setTimeout(() => {
        if (!this.isPaused) {
          this.processQueue()
        }
      }, 1000 * Math.pow(2, uploadFile.retries)) // Exponential backoff
      
      logger.info('Retrying upload', {
        metadata: {
          fileId: uploadFile.id,
          retryAttempt: uploadFile.retries
        }
      })
    } else {
      // Max retries reached
      uploadFile.error = errorMessage
      this.updateFileStatus(uploadFile, 'error')
      this.onErrorCallback?.(uploadFile, errorMessage)

      const result: UploadResult = {
        id: uploadFile.id,
        success: false,
        error: errorMessage
      }
      
      this.onCompleteCallback?.(result)
    }
  }

  /**
   * Update file status and notify callback
   */
  private updateFileStatus(uploadFile: UploadFile, status: UploadFile['status']): void {
    uploadFile.status = status
    this.onProgressCallback?.(uploadFile)
  }

  /**
   * Pause the upload queue
   */
  pause(): void {
    this.isPaused = true
    
    // Pause active uploads
    this.queue.forEach(file => {
      if (file.status === 'uploading' && file.xhr) {
        file.xhr.abort()
        file.status = 'paused'
      }
    })
    
    logger.info('Upload queue paused')
  }

  /**
   * Resume the upload queue
   */
  resume(): void {
    this.isPaused = false
    
    // Reset paused files to pending
    this.queue.forEach(file => {
      if (file.status === 'paused') {
        file.status = 'pending'
        file.xhr = undefined
      }
    })
    
    this.processQueue()
    logger.info('Upload queue resumed')
  }

  /**
   * Cancel a specific file upload
   */
  cancel(fileId: string): boolean {
    const file = this.queue.find(f => f.id === fileId)
    if (!file) return false

    if (file.xhr) {
      file.xhr.abort()
    }

    file.status = 'cancelled'
    this.uploading.delete(fileId)
    
    logger.info('File upload cancelled', { metadata: { fileId } })
    return true
  }

  /**
   * Clear completed and cancelled files from queue
   */
  clearCompleted(): void {
    const before = this.queue.length
    this.queue = this.queue.filter(f => 
      !['completed', 'cancelled'].includes(f.status)
    )
    
    logger.info('Cleared completed uploads', {
      metadata: {
        removedCount: before - this.queue.length,
        remainingCount: this.queue.length
      }
    })
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      uploading: 0,
      completed: 0,
      error: 0,
      paused: 0,
      cancelled: 0
    }

    this.queue.forEach(file => {
      stats[file.status]++
    })

    return stats
  }

  /**
   * Get all files in queue
   */
  getFiles(): UploadFile[] {
    return [...this.queue]
  }

  /**
   * Get a specific file by ID
   */
  getFile(id: string): UploadFile | undefined {
    return this.queue.find(f => f.id === id)
  }

  /**
   * Update leaf ID for pending uploads
   */
  updateLeafId(leafId: string): void {
    this.queue.forEach(file => {
      if (!file.leafId && file.status === 'pending') {
        file.leafId = leafId
      }
    })
  }
}

/**
 * Create a singleton upload queue instance
 */
let globalUploadQueue: UploadQueue | null = null

export function getUploadQueue(options?: UploadOptions): UploadQueue {
  if (!globalUploadQueue) {
    globalUploadQueue = new UploadQueue(options)
  }
  return globalUploadQueue
}