/**
 * Global Leaf Creator
 * Standalone leaf creation that works independently of trees/branches
 * Users can create leaves and assign them later or immediately
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { LeafType, Milestone } from '@/types/database'
import { BranchWithMembers } from '@/types/common'
import { uploadLeafMedia } from '@/lib/leaves'
import { createComponentLogger } from '@/lib/logger'
import { showError } from '@/lib/toast-service'
import { useMilestones, useCreateUnassignedLeaf, useAssignLeafToBranches } from '@/hooks/use-leaves'

const logger = createComponentLogger('GlobalLeafCreator')

interface GlobalLeafCreatorProps {
  onSave: () => void
  onCancel: () => void
  userBranches?: BranchWithMembers[]
  userId: string
}

interface LeafFormData {
  leaf_type: LeafType
  content: string
  media_files: File[]
  tags: string[]
  milestone_type?: string
  milestone_date?: string
  assignment_choice: 'none' | 'single' | 'multiple'
  selected_branches: string[]
}

export default function GlobalLeafCreator({ 
  onSave, 
  onCancel, 
  userBranches = [],
  userId 
}: GlobalLeafCreatorProps) {
  const [step, setStep] = useState<'create' | 'assign' | 'saving'>('create')
  const [formData, setFormData] = useState<LeafFormData>({
    leaf_type: 'photo',
    content: '',
    media_files: [],
    tags: [],
    assignment_choice: 'none',
    selected_branches: []
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // React Query hooks
  const { data: milestones = [] } = useMilestones()
  const createLeafMutation = useCreateUnassignedLeaf()
  const assignLeafMutation = useAssignLeafToBranches()
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)


  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const leafTypeOptions = [
    { type: 'photo' as LeafType, icon: '📸', label: 'Photo', description: 'Capture a moment' },
    { type: 'video' as LeafType, icon: '🎥', label: 'Video', description: 'Record in motion' },
    { type: 'audio' as LeafType, icon: '🎵', label: 'Voice Note', description: 'Record sounds' },
    { type: 'text' as LeafType, icon: '📝', label: 'Written Leaf', description: 'Write about it' },
    { type: 'milestone' as LeafType, icon: '⭐', label: 'Milestone', description: 'Mark achievement' }
  ]

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

  const handleNext = () => {
    if (step === 'create') {
      if (userBranches.length > 0) {
        setStep('assign')
      } else {
        // No branches available, save as unassigned
        handleSave()
      }
    }
  }

  const handleSave = async () => {
    setStep('saving')
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

      // Create the leaf
      const leafData = {
        author_id: userId,
        leaf_type: formData.leaf_type,
        content: formData.content || null,
        media_urls: mediaUrls,
        tags: formData.tags,
        milestone_type: formData.milestone_type || null,
        milestone_date: formData.milestone_date || null
      }

      const createdLeaf = await createLeafMutation.mutateAsync(leafData)

      // Handle assignment if specified
      if (formData.assignment_choice !== 'none' && formData.selected_branches.length > 0) {
        await assignLeafMutation.mutateAsync({
          leafId: createdLeaf.id,
          branchIds: formData.selected_branches,
          assignedBy: userId,
          primaryBranchId: formData.selected_branches[0] // First branch as primary
        })
      }

      logger.info('Leaf created successfully', {
        action: 'createLeaf',
        metadata: {
          leafId: createdLeaf.id,
          leafType: formData.leaf_type,
          assignmentChoice: formData.assignment_choice,
          branchCount: formData.selected_branches.length
        }
      })

      onSave()
    } catch (error: unknown) {
      logger.error('Failed to create leaf', error, { action: 'createLeaf' })
      showError(`Failed to create leaf: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStep('create')
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    if (formData.leaf_type === 'milestone' && !formData.milestone_type) {
      return false
    }
    return formData.content.trim() || formData.media_files.length > 0
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Leaf</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'create' ? 'text-blue-600' : step === 'assign' || step === 'saving' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'create' ? 'bg-blue-600 text-white' : step === 'assign' || step === 'saving' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                1
              </div>
              <span className="text-sm font-medium">Create</span>
            </div>
            <div className={`w-8 h-px ${step === 'assign' || step === 'saving' ? 'bg-green-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center space-x-2 ${step === 'assign' ? 'text-blue-600' : step === 'saving' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'assign' ? 'bg-blue-600 text-white' : step === 'saving' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                2
              </div>
              <span className="text-sm font-medium">Assign</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 'create' && (
            <div className="space-y-6">
              {/* Leaf Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Leaf Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {leafTypeOptions.map(option => (
                    <button
                      key={option.type}
                      onClick={() => setFormData(prev => ({ ...prev, leaf_type: option.type }))}
                      className={`p-4 rounded-lg border text-center transition-colors ${
                        formData.leaf_type === option.type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestone Selection */}
              {formData.leaf_type === 'milestone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Milestone Type</label>
                  <select
                    value={formData.milestone_type || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, milestone_type: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a milestone...</option>
                    {milestones.map(milestone => (
                      <option key={milestone.id} value={milestone.name}>
                        {milestone.display_name}
                      </option>
                    ))}
                  </select>
                  
                  {formData.milestone_type && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Milestone Date</label>
                      <input
                        type="date"
                        value={formData.milestone_date || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, milestone_date: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share what this leaf is about..."
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add photos, videos, or audio
                  </div>
                </button>

                {/* Media Preview */}
                {formData.media_files.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.media_files.map((file, index) => (
                      <div key={index} className="relative group">
                        {file.type.startsWith('image/') ? (
                          <Image
                            src={previewUrls[index]}
                            alt={`Preview ${index + 1}`}
                            width={150}
                            height={150}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm text-gray-500">{file.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeMedia(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'assign' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assign to Branches</h3>
                <p className="text-sm text-gray-600 mb-6">
                  You can assign this leaf to branches now, or leave it unassigned and organize it later.
                </p>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="none"
                      checked={formData.assignment_choice === 'none'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        assignment_choice: e.target.value as 'none' | 'single' | 'multiple',
                        selected_branches: []
                      }))}
                      className="mr-3 text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Save Unassigned</div>
                      <div className="text-sm text-gray-500">Organize this leaf later</div>
                    </div>
                  </label>

                  {userBranches.length > 0 && (
                    <>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="single"
                          checked={formData.assignment_choice === 'single'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            assignment_choice: e.target.value as 'none' | 'single' | 'multiple',
                            selected_branches: []
                          }))}
                          className="mr-3 text-blue-600"
                        />
                        <div>
                          <div className="font-medium">Assign to One Branch</div>
                          <div className="text-sm text-gray-500">Add to a specific branch</div>
                        </div>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="multiple"
                          checked={formData.assignment_choice === 'multiple'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            assignment_choice: e.target.value as 'none' | 'single' | 'multiple',
                            selected_branches: []
                          }))}
                          className="mr-3 text-blue-600"
                        />
                        <div>
                          <div className="font-medium">Assign to Multiple Branches</div>
                          <div className="text-sm text-gray-500">Share across multiple branches</div>
                        </div>
                      </label>
                    </>
                  )}
                </div>

                {/* Branch Selection */}
                {formData.assignment_choice !== 'none' && userBranches.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Select Branches</h4>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
                      {userBranches.map(branch => (
                        <label key={branch.branch_id} className="flex items-center p-3 hover:bg-gray-50">
                          <input
                            type={formData.assignment_choice === 'single' ? 'radio' : 'checkbox'}
                            value={branch.branch_id}
                            checked={formData.selected_branches.includes(branch.branch_id)}
                            onChange={(e) => {
                              if (formData.assignment_choice === 'single') {
                                setFormData(prev => ({
                                  ...prev,
                                  selected_branches: e.target.checked ? [branch.branch_id] : []
                                }))
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  selected_branches: e.target.checked
                                    ? [...prev.selected_branches, branch.branch_id]
                                    : prev.selected_branches.filter(id => id !== branch.branch_id)
                                }))
                              }
                            }}
                            className="mr-3 text-blue-600"
                          />
                          <div className="flex items-center flex-1">
                            <div
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: branch.branches?.color }}
                            />
                            <div>
                              <div className="font-medium">{branch.branches?.name}</div>
                              <div className="text-sm text-gray-500">{branch.member_count} members</div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">🌿</div>
              <p className="text-gray-600">Creating your leaf...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'saving' && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {step === 'create' && 'Step 1 of 2'}
              {step === 'assign' && 'Step 2 of 2'}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={step === 'create' ? onCancel : () => setStep('create')}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {step === 'create' ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={step === 'create' ? handleNext : handleSave}
                disabled={!canProceed() || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'create' ? (userBranches.length > 0 ? 'Next' : 'Save') : 'Create Leaf'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}