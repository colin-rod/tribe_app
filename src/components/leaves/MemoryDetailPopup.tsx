/**
 * Memory Detail Popup
 * Minimalistic popup for editing memory details, similar to memory creation
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { UnassignedLeaf } from '@/types/common'
import { BranchWithDetails } from '@/types/database'
import { Camera, Video, Mic, Flag, Hash, X, Tag, MapPin, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/IconLibrary'
import { formatDistanceToNow } from 'date-fns'
import { extractAllTags, isMilestoneTag, getMilestoneTagDisplayName } from '@/lib/milestone-tags'
import { COMMON_ANIMATIONS } from '@/lib/animations'

interface MemoryDetailPopupProps {
  leaf: UnassignedLeaf
  branches: BranchWithDetails[]
  isOpen: boolean
  onClose: () => void
  onAssign: (leafId: string, branchIds: string[]) => void
  onDelete?: (leafId: string) => void
  onUpdateContent?: (leafId: string, content: string) => void
  onUpdateTags?: (leafId: string, tags: string[]) => void
}

export default function MemoryDetailPopup({
  leaf,
  branches,
  isOpen,
  onClose,
  onAssign,
  onDelete,
  onUpdateContent,
  onUpdateTags
}: MemoryDetailPopupProps) {
  const [editedContent, setEditedContent] = useState(leaf.content || '')
  const [editedTags, setEditedTags] = useState<string[]>(leaf.tags || [])
  const [newTag, setNewTag] = useState('')
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'assign'>('details')
  const [isEditing, setIsEditing] = useState(false)

  // Auto-detected tags from content
  const autoTags = extractAllTags(editedContent)
  const allTags = [...new Set([...editedTags, ...autoTags])]

  const getLeafIcon = (leafType: string) => {
    switch (leafType) {
      case 'photo': return <Camera className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio': return <Mic className="w-4 h-4" />
      case 'milestone': return <Flag className="w-4 h-4" />
      default: return <Hash className="w-4 h-4" />
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      const updatedTags = [...editedTags, newTag.trim()]
      setEditedTags(updatedTags)
      onUpdateTags?.(leaf.id, updatedTags)
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    if (editedTags.includes(tagToRemove)) {
      const updatedTags = editedTags.filter(tag => tag !== tagToRemove)
      setEditedTags(updatedTags)
      onUpdateTags?.(leaf.id, updatedTags)
    }
  }

  const handleContentSave = () => {
    onUpdateContent?.(leaf.id, editedContent)
    setIsEditing(false)
  }

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    )
  }

  const handleAssign = () => {
    if (selectedBranches.length > 0) {
      onAssign(leaf.id, selectedBranches)
      onClose()
    }
  }

  // Clean email content for display
  const cleanContent = leaf.content?.replace(/Subject: .+?\n\n?/g, '').replace(/\n\n\[.+ media file\(s\) attached\]/g, '').trim()
  const isEmailOrigin = leaf.content?.includes('Subject:')
  const hasMedia = leaf.media_urls && leaf.media_urls.length > 0

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 max-w-2xl w-full max-h-[85vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                {getLeafIcon(leaf.leaf_type)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  Memory Details
                  <Badge variant="secondary" className="text-xs">
                    {leaf.leaf_type}
                  </Badge>
                  {isEmailOrigin && (
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                      📧 Email
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-gray-500">
                  Created {formatDistanceToNow(new Date(leaf.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'details' ? 'assign' : 'details')}
                className="text-xs"
              >
                {activeTab === 'details' ? 'Assign' : 'Details'}
              </Button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {activeTab === 'details' ? (
              <div className="p-6 space-y-6">
                {/* Media Display */}
                {hasMedia && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Media</label>
                    <div className="grid grid-cols-2 gap-3">
                      {leaf.media_urls!.slice(0, 4).map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          {leaf.leaf_type === 'photo' ? (
                            <Image
                              src={url}
                              alt={`Media ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          ) : leaf.leaf_type === 'video' ? (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Video className="w-8 h-8 text-gray-400" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                              <Mic className="w-8 h-8 text-gray-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {leaf.media_urls!.length > 4 && (
                      <p className="text-xs text-gray-500">+{leaf.media_urls!.length - 4} more files</p>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Content</label>
                    {!isEditing && cleanContent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        placeholder="Add details about this memory..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleContentSave}
                          className="text-xs"
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditedContent(leaf.content || '')
                            setIsEditing(false)
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {cleanContent || (
                        <span className="text-gray-400 italic">No content added yet</span>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Caption */}
                {leaf.ai_caption && leaf.ai_caption !== leaf.content && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">AI Caption</label>
                    <p className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
                      {leaf.ai_caption}
                    </p>
                  </div>
                )}

                {/* Milestone */}
                {leaf.milestone_type && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Milestone</label>
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Flag className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">{leaf.milestone_type}</span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Tags
                      {autoTags.length > 0 && (
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          ({autoTags.length} auto-detected)
                        </span>
                      )}
                    </label>
                  </div>
                  
                  {/* Display Tags */}
                  {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <span 
                          key={tag} 
                          className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${
                            isMilestoneTag(tag) 
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-300' 
                              : editedTags.includes(tag)
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-gray-50 text-gray-600 border-gray-300'
                          }`}
                        >
                          {isMilestoneTag(tag) && <Flag className="w-3 h-3 mr-1" />}
                          #{getMilestoneTagDisplayName(tag)}
                          {editedTags.includes(tag) && (
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 text-current opacity-60 hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add Tag */}
                  <div className="flex gap-2">
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add a tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <Button
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      size="sm"
                      className="px-3"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t border-gray-200">
                  <User className="w-4 h-4" />
                  <span>Created by {leaf.author_first_name} {leaf.author_last_name}</span>
                </div>
              </div>
            ) : (
              /* Assignment Tab */
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Assign to Branches
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedBranches.includes(branch.id)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleBranchSelection(branch.id)}
                      >
                        <div className="flex items-center flex-1 gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: branch.color }}
                          />
                          <div>
                            <div className="font-medium text-sm text-gray-900">{branch.name}</div>
                            {branch.description && (
                              <div className="text-xs text-gray-500 mt-1">{branch.description}</div>
                            )}
                          </div>
                        </div>
                        {selectedBranches.includes(branch.id) && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-200">
            <div className="flex gap-2">
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDelete(leaf.id)
                    onClose()
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {activeTab === 'assign' && (
                <Button
                  onClick={handleAssign}
                  disabled={selectedBranches.length === 0}
                  size="sm"
                  className="shadow-sm"
                >
                  Assign to {selectedBranches.length} Branch{selectedBranches.length !== 1 ? 'es' : ''}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}