'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { LeafType, Milestone, LeafEnhancementRequest, LeafEnhancementResult } from '@/types/database'
import { getPromptingEngine } from '@/lib/ai/promptingEngine'

interface LeafCreatorProps {
  branchId: string
  branchName: string
  treeName: string
  childAge?: number
  milestones: Milestone[]
  onSave: (leafData: LeafData) => Promise<void>
  onCancel: () => void
}

interface LeafData {
  leaf_type: LeafType
  content: string
  media_urls: string[]
  tags: string[]
  milestone_type?: string
  milestone_date?: string
  season?: string
  ai_caption?: string
  ai_tags: string[]
}

export default function LeafCreator({ 
  branchId, 
  branchName, 
  treeName, 
  childAge,
  milestones,
  onSave, 
  onCancel 
}: LeafCreatorProps) {
  const [step, setStep] = useState<'capture' | 'enhance' | 'save'>('capture')
  const [leafType, setLeafType] = useState<LeafType>('memory')
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [selectedMilestone, setSelectedMilestone] = useState<string>('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [season, setSeason] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancement, setEnhancement] = useState<LeafEnhancementResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const leafTypeOptions: { type: LeafType; icon: string; label: string; description: string }[] = [
    { type: 'photo', icon: '📸', label: 'Photo', description: 'Capture a special moment' },
    { type: 'video', icon: '🎥', label: 'Video', description: 'Record a memory in motion' },
    { type: 'audio', icon: '🎵', label: 'Voice Note', description: 'Record thoughts or sounds' },
    { type: 'text', icon: '📝', label: 'Written Memory', description: 'Write about a moment' },
    { type: 'milestone', icon: '⭐', label: 'Milestone', description: 'Mark a special achievement' },
    { type: 'memory', icon: '💭', label: 'General Memory', description: 'Any precious memory' }
  ]

  const handleMediaCapture = (files: File[]) => {
    setMediaFiles(files)
    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file))
    setMediaUrls(urls)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleMediaCapture(files)
    }
  }

  const startCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      // Fallback to file input
      fileInputRef.current?.click()
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' })
            handleMediaCapture([file])
          }
        }, 'image/jpeg', 0.8)

        // Stop camera stream
        const stream = video.srcObject as MediaStream
        stream?.getTracks().forEach(track => track.stop())
      }
    }
  }

  const handleAIEnhance = async () => {
    setIsEnhancing(true)
    try {
      const promptingEngine = getPromptingEngine()
      const request: LeafEnhancementRequest = {
        leafId: '', // Will be generated on save
        content,
        mediaUrls,
        context: {
          authorName: 'Parent', // TODO: Get from user context
          branchName,
          treeName,
          childAge,
          existingTags: tags
        }
      }

      const result = await promptingEngine.enhanceLeaf(request)
      setEnhancement(result)
      
      // Auto-apply AI suggestions
      if (result.suggestedTags.length > 0) {
        setTags(prev => [...new Set([...prev, ...result.suggestedTags])])
      }
      
      if (result.detectedMilestone) {
        setSelectedMilestone(result.detectedMilestone.type)
        setLeafType('milestone')
      }
      
      if (result.suggestedSeason) {
        setSeason(result.suggestedSeason)
      }
      
    } catch (error) {
      console.error('Error enhancing leaf:', error)
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Upload media files to storage and get URLs
      const uploadedUrls = mediaUrls // Placeholder - implement actual upload
      
      const leafData: LeafData = {
        leaf_type: leafType,
        content,
        media_urls: uploadedUrls,
        tags,
        milestone_type: selectedMilestone || undefined,
        milestone_date: milestoneDate || undefined,
        season,
        ai_caption: enhancement?.suggestedCaption,
        ai_tags: enhancement?.suggestedTags || []
      }

      await onSave(leafData)
    } catch (error) {
      console.error('Error saving leaf:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const addTag = (newTag: string) => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()])
    }
  }

  const renderCaptureStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Create a New Leaf 🌿</h2>
      
      {/* Leaf Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">What type of memory?</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {leafTypeOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => setLeafType(option.type)}
              className={`p-3 text-left border-2 rounded-lg transition-all ${
                leafType === option.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-gray-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe this memory
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What happened? How did it make you feel? Who was there?"
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Media Capture */}
      {(leafType === 'photo' || leafType === 'video' || leafType === 'audio') && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {leafType === 'photo' ? 'Photo' : leafType === 'video' ? 'Video' : 'Audio'}
          </label>
          
          <div className="flex space-x-3">
            <button
              onClick={leafType === 'photo' ? startCameraCapture : () => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {leafType === 'photo' ? '📷 Take Photo' : leafType === 'video' ? '🎥 Record' : '🎤 Record'}
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              📁 Choose File
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={leafType === 'photo' ? 'image/*' : leafType === 'video' ? 'video/*' : 'audio/*'}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Camera preview */}
          <video ref={videoRef} className="hidden" />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Media previews */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {mediaUrls.map((url, index) => (
                <div key={index} className="relative">
                  {leafType === 'photo' ? (
                    <Image src={url} alt={`Preview ${index}`} width={200} height={200} className="rounded-lg object-cover" />
                  ) : leafType === 'video' ? (
                    <video src={url} controls className="w-full rounded-lg" />
                  ) : (
                    <audio src={url} controls className="w-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep('enhance')}
          disabled={!content.trim() && mediaUrls.length === 0}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next: Enhance ✨
        </button>
      </div>
    </div>
  )

  const renderEnhanceStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Enhance Your Leaf ✨</h2>
        <button
          onClick={handleAIEnhance}
          disabled={isEnhancing}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
        >
          {isEnhancing ? '🤔 AI Thinking...' : '🧠 AI Enhance'}
        </button>
      </div>

      {enhancement && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-medium text-purple-900 mb-2">AI Suggestions:</h3>
          <div className="space-y-2 text-sm">
            {enhancement.suggestedCaption && (
              <div>
                <span className="font-medium">Caption:</span> {enhancement.suggestedCaption}
              </div>
            )}
            {enhancement.suggestedTags.length > 0 && (
              <div>
                <span className="font-medium">Tags:</span> {enhancement.suggestedTags.join(', ')}
              </div>
            )}
            {enhancement.detectedMilestone && (
              <div>
                <span className="font-medium">Milestone Detected:</span> {enhancement.detectedMilestone.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add a tag..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              addTag(e.currentTarget.value)
              e.currentTarget.value = ''
            }
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Milestone Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Milestone (optional)</label>
        <select
          value={selectedMilestone}
          onChange={(e) => setSelectedMilestone(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a milestone...</option>
          {milestones.map((milestone) => (
            <option key={milestone.name} value={milestone.name}>
              {milestone.icon} {milestone.display_name}
            </option>
          ))}
        </select>
        {selectedMilestone && (
          <input
            type="date"
            value={milestoneDate}
            onChange={(e) => setMilestoneDate(e.target.value)}
            className="mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Season */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Season/Period</label>
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a period...</option>
          <option value="first_year">First Year</option>
          <option value="toddler">Toddler</option>
          <option value="preschool">Preschool</option>
          <option value="school_age">School Age</option>
          <option value="holiday">Holiday/Special Event</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep('capture')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Leaf 🌿'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
      {step === 'capture' && renderCaptureStep()}
      {step === 'enhance' && renderEnhanceStep()}
    </div>
  )
}