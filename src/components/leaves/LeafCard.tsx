'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import Image from 'next/image'
import { useDrag, useDrop } from 'react-dnd'
import { LeafWithDetails, ReactionType } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { useTactileCard, useParticleEffect, useHapticFeedback } from '@/hooks/useTactileInteractions'
import { Card } from '@/components/ui/card'
import { Icon, getLeafTypeIcon, type IconName } from '@/components/ui/IconLibrary'
import { motion } from 'framer-motion'

interface LeafCardProps {
  leaf: LeafWithDetails
  onReaction: (leafId: string, reactionType: ReactionType) => void
  onShare: (leafId: string, branchIds: string[]) => void
  onComment: (leafId: string, comment: string) => void
  onMove?: (leafId: string, targetBranchId: string) => void
  isDragDisabled?: boolean
  className?: string
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  heart: '❤️',
  smile: '😊', 
  laugh: '😂',
  wow: '😮',
  care: '🥰',
  love: '💕'
}

const LeafCard = memo(function LeafCard({ 
  leaf, 
  onReaction, 
  onShare, 
  onComment, 
  onMove, 
  isDragDisabled = false,
  className = '' 
}: LeafCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [showReactions, setShowReactions] = useState(false)

  const { motionProps: cardMotionProps } = useTactileCard()
  const createParticles = useParticleEffect()
  const triggerHaptic = useHapticFeedback()

  // Drag and Drop
  const [{ isDragging }, drag] = useDrag({
    type: 'leaf',
    item: { id: leaf.id, type: 'leaf', leaf },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: !isDragDisabled
  })

  const [{ isOver }, drop] = useDrop({
    accept: 'leaf',
    drop: (item: { id: string; leaf: LeafWithDetails }) => {
      if (item.id !== leaf.id && onMove) {
        onMove(item.id, leaf.branch?.id || '')
        triggerHaptic('medium')
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  const handleReaction = useCallback((reactionType: ReactionType, event?: React.MouseEvent) => {
    onReaction(leaf.id, reactionType)
    setShowReactions(false)
    triggerHaptic('light')
    
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 2)
    }
  }, [leaf.id, onReaction, triggerHaptic, createParticles])

  const handleComment = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      onComment(leaf.id, newComment.trim())
      setNewComment('')
      triggerHaptic('light')
    }
  }, [leaf.id, newComment, onComment, triggerHaptic])

  const handleToggleComments = useCallback(() => {
    setShowComments(prev => !prev)
    triggerHaptic('light')
  }, [triggerHaptic])

  const handleToggleReactions = useCallback(() => {
    setShowReactions(prev => !prev)
    triggerHaptic('light')
  }, [triggerHaptic])

  const leafTypeIcon = useMemo((): IconName => {
    return getLeafTypeIcon(leaf.leaf_type)
  }, [leaf.leaf_type])

  const isEmailOrigin = useMemo(() => {
    return leaf.content?.includes('Subject:') && 
           (leaf.content?.includes('[') && leaf.content?.includes('media file(s) attached]'))
  }, [leaf.content])

  const cleanedContent = useMemo(() => {
    if (!isEmailOrigin || !leaf.content) return leaf.content

    // Extract email subject for display separately
    const subjectMatch = leaf.content.match(/Subject: (.+?)(?:\n|$)/)
    const emailSubject = subjectMatch ? subjectMatch[1] : null

    // Clean content by removing subject line and attachment notes
    let cleaned = leaf.content
      .replace(/Subject: .+?\n\n?/g, '') // Remove subject line
      .replace(/\n\n\[.+ media file\(s\) attached\]/g, '') // Remove attachment notes
      .replace(/\n\n\[.+ attachment\(s\) failed to upload\]/g, '') // Remove failure notes
      .trim()

    return { cleaned, emailSubject }
  }, [leaf.content, isEmailOrigin])

  const totalReactions = useMemo(() => 
    leaf.heart_count + leaf.smile_count + leaf.laugh_count, 
    [leaf.heart_count, leaf.smile_count, leaf.laugh_count]
  )

  const formattedDate = useMemo(() => 
    formatDistanceToNow(new Date(leaf.created_at), { addSuffix: true }),
    [leaf.created_at]
  )

  const allTags = useMemo(() => {
    const userTags = leaf.tags.map(tag => ({ tag, isAI: false }))
    const aiTags = leaf.ai_tags
      .filter(tag => !leaf.tags.includes(tag))
      .map(tag => ({ tag, isAI: true }))
    return [...userTags, ...aiTags]
  }, [leaf.tags, leaf.ai_tags])

  const cardVariant = useMemo(() => {
    if (leaf.leaf_type === 'photo') return 'polaroid'
    if (leaf.milestone_type) return 'bulletin'
    return 'leaf'
  }, [leaf.leaf_type, leaf.milestone_type])

  return (
    <div 
      ref={(node) => {
        drag(drop(node))
      }}
      className={`leaf-card transition-all duration-300 ${isDragging ? 'opacity-50 scale-105 rotate-3' : ''} ${isOver ? 'ring-4 ring-leaf-500 ring-opacity-50' : ''} ${className}`}
    >
      <motion.div
        style={{
          transformOrigin: 'center center',
          perspective: 1000
        }}
        {...cardMotionProps}
      >
        <Card variant={cardVariant} className="overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-2 bg-gradient-to-r from-flower-400/30 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {leaf.author_avatar && (
                  <div className="relative">
                    <Image 
                      src={leaf.author_avatar} 
                      alt={leaf.author_name || ''} 
                      width={40} 
                      height={40}
                      className="rounded-full ring-3 ring-leaf-300"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-fruit-400 rounded-full border-2 border-white"></div>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-bark-400 font-display">{leaf.author_name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-bark-400">
                    <Icon name={leafTypeIcon} size="md" className="text-bark-400" />
                    <span>{formattedDate}</span>
                    {isEmailOrigin && (
                      <span className="px-2 py-1 bg-flower-400 text-bark-400 rounded-full text-xs font-medium border border-flower-400">
                        📧 Email
                      </span>
                    )}
                    {leaf.season && (
                      <span className="px-2 py-1 bg-leaf-300 text-bark-400 rounded-full text-xs font-medium border border-leaf-500">
                        🌱 {leaf.season}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {leaf.milestone_type && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-fruit-400 text-bark-400 rounded-full text-sm border-3 border-bark-200 shadow-sm">
                  {leaf.milestone_icon ? (
                    <span className="text-lg">{leaf.milestone_icon}</span>
                  ) : (
                    <Icon name="star" size="md" className="text-bark-400" />
                  )}
                  <span className="font-semibold font-display">{leaf.milestone_display_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Media */}
          {leaf.media_urls && leaf.media_urls.length > 0 && (
            <div className="relative">
              {leaf.leaf_type === 'photo' && (
                <div className="relative">
                  <div className="aspect-square relative bg-flower-400 rounded-2xl overflow-hidden border-4 border-white shadow-inner">
                    <Image
                      src={leaf.media_urls[0]}
                      alt="Memory photo"
                      fill
                      className="object-cover"
                    />
                    {leaf.media_urls.length > 1 && (
                      <div className="absolute top-3 right-3 bg-bark-400/80 text-nature-white px-3 py-1 rounded-full text-sm font-semibold border border-bark-400">
                        +{leaf.media_urls.length - 1} 📸
                      </div>
                    )}
                    {isEmailOrigin && (
                      <div className="absolute bottom-3 left-3 bg-flower-400/90 text-nature-white px-2 py-1 rounded-full text-xs font-semibold border border-flower-400">
                        📧 Email Upload
                      </div>
                    )}
                  </div>
                  {/* Additional photos preview for email uploads */}
                  {isEmailOrigin && leaf.media_urls.length > 1 && (
                    <div className="mt-2 flex space-x-2 overflow-x-auto pb-2">
                      {leaf.media_urls.slice(1, 4).map((url, index) => (
                        <div key={index} className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden border-2 border-flower-400">
                          <Image
                            src={url}
                            alt={`Additional photo ${index + 2}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {leaf.media_urls.length > 4 && (
                        <div className="flex-shrink-0 w-16 h-16 bg-bark-400/80 text-nature-white rounded-lg border-2 border-bark-400 flex items-center justify-center text-xs font-bold">
                          +{leaf.media_urls.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {leaf.leaf_type === 'video' && (
                <div className="aspect-video relative bg-gradient-to-br from-sky-100 to-flower-400 rounded-2xl border-4 border-sky-300 overflow-hidden">
                  <video 
                    className="w-full h-full object-cover"
                    controls
                    poster=""
                    preload="metadata"
                  >
                    <source src={leaf.media_urls[0]} type="video/mp4" />
                    <source src={leaf.media_urls[0]} type="video/webm" />
                    <source src={leaf.media_urls[0]} type="video/ogg" />
                    Your browser does not support the video tag.
                  </video>
                  {isEmailOrigin && (
                    <div className="absolute bottom-3 left-3 bg-flower-400/90 text-nature-white px-2 py-1 rounded-full text-xs font-semibold border border-flower-400">
                      📧 Email Video
                    </div>
                  )}
                  {leaf.media_urls.length > 1 && (
                    <div className="absolute top-3 right-3 bg-bark-400/80 text-nature-white px-3 py-1 rounded-full text-sm font-semibold border border-bark-400">
                      +{leaf.media_urls.length - 1} 🎥
                    </div>
                  )}
                </div>
              )}
              
              {leaf.leaf_type === 'audio' && (
                <div className="relative bg-gradient-to-br from-flower-400 to-sky-100 rounded-2xl border-4 border-flower-400 p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">🎵</div>
                    <div className="flex-1">
                      <audio 
                        className="w-full"
                        controls
                        preload="metadata"
                      >
                        <source src={leaf.media_urls[0]} type="audio/mpeg" />
                        <source src={leaf.media_urls[0]} type="audio/ogg" />
                        <source src={leaf.media_urls[0]} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>
                  {isEmailOrigin && (
                    <div className="absolute bottom-3 left-3 bg-flower-400/90 text-nature-white px-2 py-1 rounded-full text-xs font-semibold border border-flower-400">
                      📧 Email Audio
                    </div>
                  )}
                  {leaf.media_urls.length > 1 && (
                    <div className="absolute top-3 right-3 bg-bark-400/80 text-nature-white px-3 py-1 rounded-full text-sm font-semibold border border-bark-400">
                      +{leaf.media_urls.length - 1} 🎵
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {(leaf.content || leaf.ai_caption) && (
              <div className="space-y-2">
                {/* Email Subject Display */}
                {isEmailOrigin && typeof cleanedContent === 'object' && cleanedContent.emailSubject && (
                  <div className="bg-flower-400/30 border-l-4 border-flower-400 px-3 py-2 rounded-r-lg">
                    <p className="text-bark-400 font-semibold text-sm">
                      📧 {cleanedContent.emailSubject}
                    </p>
                  </div>
                )}
                
                {/* Main Content */}
                {leaf.content && (
                  <p className="text-bark-400 leading-relaxed font-medium">
                    {isEmailOrigin && typeof cleanedContent === 'object' 
                      ? cleanedContent.cleaned 
                      : typeof cleanedContent === 'string' 
                        ? cleanedContent 
                        : leaf.content}
                  </p>
                )}
                
                {/* AI Caption */}
                {leaf.ai_caption && leaf.ai_caption !== leaf.content && (
                  <p className="text-bark-400 italic text-sm border-l-4 border-leaf-500 pl-3 bg-leaf-300/20 rounded-r-lg py-2">
                    🤖 AI: {leaf.ai_caption}
                  </p>
                )}
              </div>
            )}

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {allTags.map(({ tag, isAI }, index) => (
                  <span 
                    key={`${isAI ? 'ai' : 'user'}-tag-${index}`} 
                    className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-colors duration-150 ${
                      isAI 
                        ? 'bg-flower-400 text-bark-400 border-flower-400 opacity-75' 
                        : 'bg-leaf-300 text-bark-400 border-leaf-500'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions Bar */}
          <div className="px-4 py-3 border-t-3 border-flower-400 bg-gradient-to-r from-nature-white to-flower-400/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Reactions */}
                <div className="relative">
                  <button
                    onClick={handleToggleReactions}
                    className="flex items-center space-x-2 text-bark-400 hover:text-flower-400 transition-colors duration-150 tactile-element"
                  >
                    {leaf.user_reaction ? (
                      <span className="text-xl">{REACTION_EMOJIS[leaf.user_reaction]}</span>
                    ) : (
                      <Icon name="heart" size="md" className="text-bark-400 hover:text-red-400 transition-colors" />
                    )}
                    {totalReactions > 0 && (
                      <span className="text-sm font-semibold bg-flower-400/20 px-2 py-1 rounded-full">{totalReactions}</span>
                    )}
                  </button>
                  
                  {showReactions && (
                    <div className="absolute bottom-full left-0 mb-2 bg-surface shadow-large rounded-2xl p-3 flex space-x-2 border-3 border-leaf-300">
                      {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                        <button
                          key={type}
                          onClick={(e) => handleReaction(type as ReactionType, e)}
                          className="text-2xl hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-flower-400 tactile-element"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <button
                  onClick={handleToggleComments}
                  className="flex items-center space-x-2 text-bark-400 hover:text-sky-300 transition-colors duration-150 tactile-element"
                >
                  <Icon name="messageCircle" size="md" className="text-bark-400" />
                  {leaf.comment_count > 0 && (
                    <span className="text-sm font-semibold bg-sky-300/20 px-2 py-1 rounded-full">{leaf.comment_count}</span>
                  )}
                </button>

                {/* Share Count */}
                {leaf.share_count > 0 && (
                  <div className="flex items-center space-x-2 text-bark-200">
                    <span className="text-sm">🔗</span>
                    <span className="text-sm font-medium">{leaf.share_count}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-bark-200 font-display">
                🌳 {leaf.tree_name} • 🌿 {leaf.branch?.name}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="border-t-3 border-leaf-300 bg-nature-white/50">
              <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                {leaf.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 p-3 bg-surface rounded-xl border-2 border-flower-400">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-semibold text-bark-400 font-display">{comment.profiles.first_name}</span>
                        <span className="text-bark-200">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-bark-400 text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleComment} className="p-4 border-t-2 border-leaf-300">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 border-3 border-leaf-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-3 focus:ring-leaf-500 focus:border-leaf-500 bg-surface text-bark-400 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-6 py-2 bg-leaf-500 text-bark-400 rounded-full text-sm font-semibold hover:bg-leaf-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 border-3 border-leaf-700 shadow-md tactile-element font-display"
                  >
                    Send 🌿
                  </button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
})

export default LeafCard