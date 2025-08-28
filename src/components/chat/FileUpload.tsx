'use client'

import { useRef } from 'react'

interface FileUploadProps {
  files: File[]
  previewUrls: string[]
  onFilesAdded: (files: File[]) => void
  onFileRemove: (index: number) => void
  disabled?: boolean
  maxFiles?: number
  buttonOnly?: boolean
}

export default function FileUpload({ 
  files, 
  previewUrls, 
  onFilesAdded, 
  onFileRemove, 
  disabled = false,
  maxFiles = 5,
  buttonOnly = false
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(Array.from(e.target.files))
    }
  }

  if (buttonOnly) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          disabled={disabled || files.length >= maxFiles}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
      </>
    )
  }

  return (
    <>
      {/* File Previews */}
      {files.length > 0 && (
        <div className="mb-3">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {files.map((file, index) => (
              <div key={index} className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                  {file.type.startsWith('image/') && previewUrls[index] ? (
                    <img 
                      src={previewUrls[index]} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.type.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onFileRemove(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  )
}