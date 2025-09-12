/**
 * Global Leaf Creator
 * Simplified memory creation with automatic type detection
 * Creates unassigned leaves that can be organized later
 */

'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { uploadLeafMedia } from '@/lib/leaves'
import { createComponentLogger } from '@/lib/logger'
import { showError } from '@/lib/toast-service'
import { useCreateUnassignedLeaf } from '@/hooks/use-leaves'
import { detectLeafType, getLeafTypeDescription, getLeafTypeIcon } from '@/lib/leaf-type-detection'
import { extractAllTags, isMilestoneTag, getMilestoneTagDisplayName } from '@/lib/milestone-tags'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/IconLibrary'
import { COMMON_ANIMATIONS } from '@/lib/animations'

const logger = createComponentLogger('GlobalLeafCreator')

interface GlobalLeafCreatorProps {
  onSave: () => void
  onCancel: () => void
  userId: string
}

interface LeafFormData {
  content: string
  media_files: File[]
  tags: string[]
}

export default function GlobalLeafCreator({ 
  onSave, 
  onCancel,
  userId 
}: GlobalLeafCreatorProps) {
  const [formData, setFormData] = useState<LeafFormData>({
    content: '',
    media_files: [],
    tags: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // React Query hooks
  const createLeafMutation = useCreateUnassignedLeaf()

  // Automatic leaf type detection
  const detectionResult = useMemo(() => {
    return detectLeafType(formData.content, formData.media_files)
  }, [formData.content, formData.media_files])

  // Automatic tag extraction from content
  const autoTags = useMemo(() => {
    return extractAllTags(formData.content)
  }, [formData.content])

  // Combine manual tags with auto-detected tags
  const allTags = useMemo(() => {
    const combined = [...new Set([...formData.tags, ...autoTags])]
    return combined
  }, [formData.tags, autoTags])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviewUrls(prev => [...prev, ...urls])

    setFormData(prev => ({
      ...prev,
      media_files: [...prev.media_files, ...files]
    }))
  }

  const removeMedia = (index: number) => {
    // Revoke the URL
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index])
    }

    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    setFormData(prev => ({
      ...prev,
      media_files: prev.media_files.filter((_, i) => i !== index)
    }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)

    try {
      // Upload media files if any
      let mediaUrls: string[] = []
      if (formData.media_files.length > 0) {
        const uploadResults = await Promise.all(
          formData.media_files.map(file => uploadLeafMedia(file))
        )
        mediaUrls = uploadResults.filter(url => url !== null) as string[]
      }

      // Create the leaf with auto-detected type and all tags
      const leafData = {
        author_id: userId,
        leaf_type: detectionResult.leafType,
        content: formData.content || null,
        media_urls: mediaUrls,
        tags: allTags,
        milestone_type: null,
        milestone_date: null
      }

      const createdLeaf = await createLeafMutation.mutateAsync(leafData)

      logger.info('Memory created successfully', {
        action: 'createMemory',
        metadata: {
          leafId: createdLeaf.id,
          detectedType: detectionResult.leafType,
          confidence: detectionResult.confidence,
          tagCount: allTags.length
        }
      })

      onSave()
    } catch (error: unknown) {
      logger.error('Failed to create memory', error, { action: 'createMemory' })
      showError(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    return formData.content.trim() || formData.media_files.length > 0
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      {...COMMON_ANIMATIONS.fadeIn}
    >
      <motion.div 
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 max-w-lg w-full max-h-[85vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-leaf-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-leaf-500 to-leaf-600 rounded-full flex items-center justify-center">
              <Icon name="leaf" size="md" className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-bark-400 font-display">Share a Memory</h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-bark-400/60 hover:text-bark-400 p-2 hover:bg-leaf-100/50 rounded-full transition-colors"
            disabled={isLoading}
          >
            <Icon name="x" size="sm" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {!isLoading ? (
            <>

              {/* Share a memory */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-bark-400 font-display">Share a memory</label>
                  {(formData.content || formData.media_files.length > 0) && (
                    <motion.div 
                      className="flex items-center space-x-1"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <Icon name={getLeafTypeIcon(detectionResult.leafType)} size="xs" className="text-leaf-600/70" />
                    </motion.div>
                  )}
                </div>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="What's this memory about? Share the story behind it..."
                  rows={4}
                  className="block w-full px-4 py-3 border-2 border-leaf-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 bg-white/80 backdrop-blur-sm resize-none text-bark-400 placeholder-bark-400/50"
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-bark-400 mb-3 font-display">Media</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-4 border-2 border-dashed border-leaf-300/50 rounded-xl text-bark-400/70 hover:border-leaf-400 hover:bg-leaf-50/50 transition-all duration-200 group"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 bg-leaf-500/10 rounded-full flex items-center justify-center group-hover:bg-leaf-500/20 transition-colors">
                      <Icon name="image" size="sm" className="text-leaf-600" />
                    </div>
                    <span className="text-sm font-medium">Add photos, videos, or audio</span>
                    <span className="text-xs text-bark-400/50">Click to browse files</span>
                  </div>
                </motion.button>

                {/* Media Preview */}
                {formData.media_files.length > 0 && (
                  <motion.div 
                    className="mt-4 space-y-3"
                    {...COMMON_ANIMATIONS.slideInFromBottom}
                  >
                    {formData.media_files.map((file, index) => (
                      <motion.div 
                        key={index} 
                        className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-leaf-200/30 group"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {file.type.startsWith('image/') ? (
                          <Image
                            src={previewUrls[index]}
                            alt={`Preview ${index + 1}`}
                            width={48}
                            height={48}
                            className="w-12 h-12 object-cover rounded-lg border-2 border-leaf-200/50"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-leaf-100/50 rounded-lg flex items-center justify-center border-2 border-leaf-200/50">
                            <Icon 
                              name={file.type.startsWith('video/') ? 'video' : 'mic'} 
                              size="sm" 
                              className="text-leaf-600" 
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-bark-400 truncate">{file.name}</p>
                          <p className="text-xs text-bark-400/60">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <motion.button
                          onClick={() => removeMedia(index)}
                          className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Icon name="x" size="xs" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-bark-400 mb-3 font-display">
                  Tags
                  {autoTags.length > 0 && (
                    <span className="text-xs font-normal text-bark-400/60 ml-2">
                      ({autoTags.length} auto-detected)
                    </span>
                  )}
                </label>
                
                {/* All Tags Display */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allTags.map(tag => (
                      <motion.span 
                        key={tag} 
                        className={`inline-flex items-center px-3 py-1 text-sm rounded-full border ${
                          isMilestoneTag(tag) 
                            ? 'bg-gradient-to-r from-flower-100 to-leaf-100 text-bark-400 border-flower-300/50' 
                            : formData.tags.includes(tag)
                            ? 'bg-leaf-100 text-leaf-700 border-leaf-300/50'
                            : 'bg-bark-100/50 text-bark-400/70 border-bark-200/50'
                        }`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        {isMilestoneTag(tag) && <Icon name="star" size="xs" className="mr-1" />}
                        {getMilestoneTagDisplayName(tag)}
                        {formData.tags.includes(tag) && (
                          <motion.button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-current opacity-60 hover:opacity-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Icon name="x" size="xs" />
                          </motion.button>
                        )}
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* Add Custom Tag */}
                <div className="flex">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a custom tag..."
                    className="flex-1 px-4 py-2 border-2 border-leaf-200/50 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 bg-white/80 backdrop-blur-sm text-bark-400 placeholder-bark-400/50"
                  />
                  <Button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    variant="leaf"
                    size="sm"
                    className="rounded-l-none rounded-r-xl border-l-0"
                  >
                    <Icon name="plus" size="xs" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <motion.div 
                className="w-12 h-12 bg-gradient-to-br from-leaf-500 to-leaf-600 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Icon name="leaf" size="lg" className="text-white" />
              </motion.div>
              <p className="text-bark-400 font-display">Creating your memory...</p>
              <p className="text-sm text-bark-400/60 mt-1">This won't take long</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="flex items-center justify-end px-6 py-4 bg-gradient-to-r from-leaf-50/50 to-flower-50/50 border-t border-leaf-200/50">
            <div className="flex space-x-3">
              <Button
                onClick={onCancel}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-bark-200/50 text-bark-400/70 hover:bg-bark-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canProceed() || isLoading}
                variant="leaf"
                size="sm"
                className="shadow-lg"
              >
                <Icon name="leaf" size="xs" className="mr-1" />
                Save Memory
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}