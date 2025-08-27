'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface CreatePostClientProps {
  user: User
  branch: any
}

const milestoneTypes = [
  'first_smile',
  'first_laugh', 
  'first_word',
  'first_steps',
  'first_tooth',
  'first_solid_food',
  'birthday',
  'christmas',
  'vacation',
  'other'
]

// Common emojis for family posts
const popularEmojis = [
  '😀', '😊', '😍', '🥰', '😘', '😂', '🤣', '😭', '🥳', '😴',
  '👶', '👧', '👦', '👨', '👩', '👪', '👨‍👩‍👧‍👦', '👨‍👩‍👧', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧',
  '❤️', '💕', '💖', '💗', '💝', '🥰', '🤗', '👏', '🎉', '✨',
  '🎂', '🎁', '🌟', '⭐', '💫', '🌈', '🌸', '🌺', '🌻', '🌷',
  '🍰', '🧁', '🍼', '🍪', '🍎', '🥛', '🧸', '🎈', '🎀', '👑'
]

// Helper function to format time for auto-save indicator
const formatTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return date.toLocaleDateString()
}

export default function CreatePostClient({ user, branch }: CreatePostClientProps) {
  const [content, setContent] = useState('')
  const [milestoneType, setMilestoneType] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Auto-save key for localStorage
  const draftKey = `post-draft-${branch.id}-${user.id}`

  // Load draft from localStorage on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setContent(draft.content || '')
        setMilestoneType(draft.milestoneType || '')
        setMilestoneDate(draft.milestoneDate || '')
        setLastSaved(new Date(draft.timestamp))
        setHasUnsavedChanges(false)
      } catch (error) {
        console.error('Error loading draft:', error)
        localStorage.removeItem(draftKey)
      }
    }
  }, [draftKey])

  // Auto-save draft every 2 seconds when content changes
  useEffect(() => {
    if (!content && !milestoneType && !milestoneDate) return

    const timeoutId = setTimeout(() => {
      const draft = {
        content,
        milestoneType,
        milestoneDate,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(draftKey, JSON.stringify(draft))
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [content, milestoneType, milestoneDate, draftKey])

  // Mark as having unsaved changes when content changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [content, milestoneType, milestoneDate])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  // Clear draft after successful post creation
  const clearDraft = () => {
    localStorage.removeItem(draftKey)
    setLastSaved(null)
    setHasUnsavedChanges(false)
  }

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('video/')) {
        // For videos, we'll use a placeholder or generate thumbnail
        resolve('/api/placeholder/video-thumbnail') // Placeholder for now
      } else {
        resolve('')
      }
    })
  }

  const addFiles = async (newFiles: File[]) => {
    // Limit to 5 files total
    if (newFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed')
      return
    }

    const validFiles = newFiles.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/')
      const isValidSize = file.size <= 50 * 1024 * 1024 // 50MB limit
      
      if (!isValidType) {
        alert(`${file.name} is not a supported file type`)
        return false
      }
      if (!isValidSize) {
        alert(`${file.name} is too large (max 50MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    const newPreviews = await Promise.all(validFiles.map(generatePreview))
    
    setFiles([...files, ...validFiles])
    setPreviewUrls([...previewUrls, ...newPreviews])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      addFiles(droppedFiles)
    }
  }

  const removeFile = (index: number) => {
    // Revoke the object URL to free memory
    if (previewUrls[index] && previewUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(previewUrls[index])
    }
    
    setFiles(files.filter((_, i) => i !== index))
    setPreviewUrls(previewUrls.filter((_, i) => i !== index))
    setUploadProgress(uploadProgress.filter((_, i) => i !== index))
  }

  const uploadFile = async (file: File, index: number): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${branch.id}/${Date.now()}-${Math.random()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(fileName, file, {
        onUploadProgress: (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          setUploadProgress(prev => {
            const newProgress = [...prev]
            newProgress[index] = percent
            return newProgress
          })
        }
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && files.length === 0) {
      alert('Please add some content or media')
      return
    }

    setLoading(true)
    setUploadProgress(new Array(files.length).fill(0))

    try {
      // Upload files if any
      let mediaUrls: string[] = []
      if (files.length > 0) {
        mediaUrls = await Promise.all(
          files.map((file, index) => uploadFile(file, index))
        )
      }

      // Create the post
      const { data, error } = await supabase
        .from('posts')
        .insert({
          branch_id: branch.id,
          author_id: user.id,
          content: content.trim() || null,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          milestone_type: milestoneType || null,
          milestone_date: milestoneDate || null
        })
        .select()
        .single()

      if (error) throw error

      // Clear the draft after successful posting
      clearDraft()
      
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating post:', error)
      alert(`Failed to create post: ${error.message}`)
    } finally {
      setLoading(false)
      setUploadProgress([])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: branch.color }}
                />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">New Post</h1>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{branch.name}</p>
                    {lastSaved && (
                      <div className="flex items-center space-x-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className="text-xs text-gray-400">
                          {hasUnsavedChanges ? 'Saving...' : `Saved ${formatTime(lastSaved)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6">
            {/* Content */}
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                What's happening?
              </label>
              <div className="relative">
                <textarea
                  id="content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="block w-full px-3 py-2 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Share a memory, update, or milestone..."
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
                  title="Add emoji"
                >
                  <span className="text-lg">😊</span>
                </button>
                
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className="absolute top-full right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-80"
                  >
                    <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                      {popularEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="text-lg hover:bg-gray-100 rounded p-1 transition-colors"
                          title={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 text-center">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Milestone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="milestone" className="block text-sm font-medium text-gray-700 mb-2">
                  Milestone (optional)
                </label>
                <select
                  id="milestone"
                  value={milestoneType}
                  onChange={(e) => setMilestoneType(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a milestone</option>
                  {milestoneTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              
              {milestoneType && (
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos & Videos
              </label>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                  isDragging 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer flex flex-col items-center ${loading ? 'pointer-events-none' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    isDragging ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <svg className={`w-6 h-6 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className={`text-sm font-medium ${isDragging ? 'text-blue-600' : 'text-gray-900'}`}>
                    {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Photos, videos up to 50MB • Maximum 5 files
                  </span>
                </label>
              </div>

              {/* File Preview */}
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        {/* Thumbnail */}
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {previewUrls[index] && file.type.startsWith('image/') ? (
                            <img 
                              src={previewUrls[index]} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : file.type.startsWith('video/') ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Upload Progress Overlay */}
                          {loading && uploadProgress[index] !== undefined && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="text-center text-white">
                                <div className="w-8 h-8 mb-1">
                                  <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </div>
                                <div className="text-xs">{Math.round(uploadProgress[index])}%</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Remove Button */}
                          {!loading && (
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* File Info */}
                        <div className="mt-1">
                          <p className="text-xs font-medium text-gray-900 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add more files button */}
                  {files.length < 5 && !loading && (
                    <label htmlFor="file-upload" className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add More Files ({5 - files.length} remaining)
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (!content.trim() && files.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}