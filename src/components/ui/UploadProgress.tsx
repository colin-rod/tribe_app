'use client'

import React from 'react'
import { CheckCircle, XCircle, Loader, Pause, Play } from 'lucide-react'

export interface UploadProgressProps {
  files: Array<{
    id: string
    name: string
    size: number
    progress?: number
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused'
    error?: string
  }>
  onRetry?: (fileId: string) => void
  onCancel?: (fileId: string) => void
  onPause?: (fileId: string) => void
  onResume?: (fileId: string) => void
  className?: string
}

export function UploadProgress({
  files,
  onRetry,
  onCancel,
  onPause,
  onResume,
  className = ''
}: UploadProgressProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />
      case 'uploading':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />
    }
  }

  const getStatusText = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
      case 'paused':
        return 'Paused'
      case 'uploading':
        return progress ? `${Math.round(progress)}%` : 'Uploading...'
      case 'pending':
        return 'Waiting...'
      default:
        return 'Unknown'
    }
  }

  const overallProgress = files.length > 0 
    ? files.reduce((sum, file) => sum + (file.progress || 0), 0) / files.length
    : 0

  const completedFiles = files.filter(file => file.status === 'completed').length
  const failedFiles = files.filter(file => file.status === 'error').length
  const uploadingFiles = files.filter(file => file.status === 'uploading').length

  if (files.length === 0) {
    return null
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">
            Upload Progress
          </h3>
          <span className="text-xs text-gray-500">
            {completedFiles}/{files.length} files
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{Math.round(overallProgress)}% complete</span>
          <span>
            {uploadingFiles > 0 && `${uploadingFiles} uploading`}
            {failedFiles > 0 && ` • ${failedFiles} failed`}
          </span>
        </div>
      </div>

      {/* Individual File Progress */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {files.map((file) => (
          <div key={file.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(file.status, file.progress)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                  {file.name}
                </p>
                <span className="text-xs text-gray-500 ml-2">
                  {formatFileSize(file.size)}
                </span>
              </div>

              {/* Progress Bar */}
              {(file.status === 'uploading' || file.status === 'paused') && (
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        file.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${file.progress || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status Text */}
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${
                  file.status === 'error' ? 'text-red-500' : 
                  file.status === 'completed' ? 'text-green-500' : 
                  'text-gray-500'
                }`}>
                  {getStatusText(file.status, file.progress)}
                </span>

                {/* Error Message */}
                {file.error && (
                  <span className="text-xs text-red-500 truncate" title={file.error}>
                    {file.error}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 flex space-x-1">
              {/* Pause/Resume */}
              {file.status === 'uploading' && onPause && (
                <button
                  onClick={() => onPause(file.id)}
                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                  title="Pause upload"
                >
                  <Pause className="w-3 h-3" />
                </button>
              )}

              {file.status === 'paused' && onResume && (
                <button
                  onClick={() => onResume(file.id)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Resume upload"
                >
                  <Play className="w-3 h-3" />
                </button>
              )}

              {/* Retry */}
              {file.status === 'error' && onRetry && (
                <button
                  onClick={() => onRetry(file.id)}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  title="Retry upload"
                >
                  Retry
                </button>
              )}

              {/* Cancel/Remove */}
              {(file.status === 'pending' || file.status === 'uploading' || file.status === 'paused' || file.status === 'error') && onCancel && (
                <button
                  onClick={() => onCancel(file.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Cancel upload"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      {files.length > 1 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Total: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
            </span>
            <div className="space-x-4">
              {completedFiles > 0 && (
                <span className="text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {completedFiles} completed
                </span>
              )}
              {failedFiles > 0 && (
                <span className="text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {failedFiles} failed
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadProgress