'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import Image from 'next/image'
import { useDrag, useDrop } from 'react-dnd'
import { LeafWithDetails, ReactionType } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { useTactileCard, useParticleEffect, useHapticFeedback } from '@/hooks/useTactileInteractions'
import { Card } from '@/components/ui/card'

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

  const { bind: cardBind, springs: cardSprings, animated } = useTactileCard()
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

  const leafTypeIcon = useMemo(() => {
    switch (leaf.leaf_type) {
      case 'photo': return '📸'
      case 'video': return '🎥'
      case 'audio': return '🎵'
      case 'milestone': return leaf.milestone_icon || '⭐'
      case 'memory': return '💭'
      case 'text': return '📝'
      default: return '🌿'
    }
  }, [leaf.leaf_type, leaf.milestone_icon])

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
      className={`leaf-card transition-all duration-300 ${isDragging ? 'opacity-50 scale-105 rotate-3' : ''} ${isOver ? 'ring-4 ring-ac-sage ring-opacity-50' : ''} ${className}`}
    >
      <animated.div
        style={{
          transform: cardSprings.rotateX.to(rx => 
            cardSprings.rotateY.to(ry => 
              cardSprings.scale.to(s => 
                cardSprings.y.to(y => 
                  cardSprings.rotateZ.to(rz => 
                    `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s}) translateY(${y}px)`
                  )
                )
              )
            )
          ),
          transformOrigin: 'center center'
        }}
        {...cardBind()}
      >
        <Card variant={cardVariant} className="overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-2 bg-gradient-to-r from-ac-peach-light/30 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {leaf.author_avatar && (
                  <div className="relative">
                    <Image 
                      src={leaf.author_avatar} 
                      alt={leaf.author_name || ''} 
                      width={40} 
                      height={40}
                      className="rounded-full ring-3 ring-ac-sage-light"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-ac-yellow rounded-full border-2 border-white"></div>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-ac-brown-dark font-display">{leaf.author_name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-ac-brown">
                    <span className="text-base">{leafTypeIcon}</span>
                    <span>{formattedDate}</span>
                    {isEmailOrigin && (
                      <span className="px-2 py-1 bg-ac-coral-light text-ac-brown-dark rounded-full text-xs font-medium border border-ac-coral">
                        📧 Email
                      </span>
                    )}
                    {leaf.season && (
                      <span className="px-2 py-1 bg-ac-sage-light text-ac-brown-dark rounded-full text-xs font-medium border border-ac-sage">
                        🌱 {leaf.season}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {leaf.milestone_type && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-ac-yellow text-ac-brown-dark rounded-full text-sm border-3 border-ac-brown-light shadow-sm">
                  <span className="text-lg">{leaf.milestone_icon}</span>
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
                  <div className="aspect-square relative bg-ac-peach-light rounded-2xl overflow-hidden border-4 border-white shadow-inner">
                    <Image
                      src={leaf.media_urls[0]}
                      alt="Memory photo"
                      fill
                      className="object-cover"
                    />
                    {leaf.media_urls.length > 1 && (
                      <div className="absolute top-3 right-3 bg-ac-brown/80 text-ac-cream px-3 py-1 rounded-full text-sm font-semibold border border-ac-brown-dark">
                        +{leaf.media_urls.length - 1} 📸
                      </div>
                    )}
                    {isEmailOrigin && (
                      <div className="absolute bottom-3 left-3 bg-ac-coral/90 text-ac-cream px-2 py-1 rounded-full text-xs font-semibold border border-ac-coral-dark">
                        📧 Email Upload
                      </div>
                    )}
                  </div>
                  {/* Additional photos preview for email uploads */}
                  {isEmailOrigin && leaf.media_urls.length > 1 && (
                    <div className="mt-2 flex space-x-2 overflow-x-auto pb-2">
                      {leaf.media_urls.slice(1, 4).map((url, index) => (
                        <div key={index} className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden border-2 border-ac-peach">
                          <Image
                            src={url}
                            alt={`Additional photo ${index + 2}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {leaf.media_urls.length > 4 && (
                        <div className="flex-shrink-0 w-16 h-16 bg-ac-brown/80 text-ac-cream rounded-lg border-2 border-ac-brown-dark flex items-center justify-center text-xs font-bold">
                          +{leaf.media_urls.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {leaf.leaf_type === 'video' && (
                <div className="aspect-video relative bg-gradient-to-br from-ac-sky-light to-ac-lavender rounded-2xl border-4 border-ac-sky overflow-hidden">
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
                    <div className="absolute bottom-3 left-3 bg-ac-coral/90 text-ac-cream px-2 py-1 rounded-full text-xs font-semibold border border-ac-coral-dark">
                      📧 Email Video
                    </div>
                  )}
                  {leaf.media_urls.length > 1 && (
                    <div className="absolute top-3 right-3 bg-ac-brown/80 text-ac-cream px-3 py-1 rounded-full text-sm font-semibold border border-ac-brown-dark">
                      +{leaf.media_urls.length - 1} 🎥
                    </div>
                  )}
                </div>
              )}
              
              {leaf.leaf_type === 'audio' && (
                <div className="relative bg-gradient-to-br from-ac-lavender to-ac-sky-light rounded-2xl border-4 border-ac-lavender p-4">
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
                    <div className="absolute bottom-3 left-3 bg-ac-coral/90 text-ac-cream px-2 py-1 rounded-full text-xs font-semibold border border-ac-coral-dark">
                      📧 Email Audio
                    </div>
                  )}
                  {leaf.media_urls.length > 1 && (
                    <div className="absolute top-3 right-3 bg-ac-brown/80 text-ac-cream px-3 py-1 rounded-full text-sm font-semibold border border-ac-brown-dark">
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
                  <div className="bg-ac-coral-light/30 border-l-4 border-ac-coral px-3 py-2 rounded-r-lg">
                    <p className="text-ac-brown-dark font-semibold text-sm">
                      📧 {cleanedContent.emailSubject}
                    </p>
                  </div>
                )}
                
                {/* Main Content */}
                {leaf.content && (
                  <p className="text-ac-brown-dark leading-relaxed font-medium">
                    {isEmailOrigin && typeof cleanedContent === 'object' 
                      ? cleanedContent.cleaned 
                      : typeof cleanedContent === 'string' 
                        ? cleanedContent 
                        : leaf.content}
                  </p>
                )}
                
                {/* AI Caption */}
                {leaf.ai_caption && leaf.ai_caption !== leaf.content && (
                  <p className="text-ac-brown italic text-sm border-l-4 border-ac-sage pl-3 bg-ac-sage-light/20 rounded-r-lg py-2">
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
                        ? 'bg-ac-peach-light text-ac-brown border-ac-peach opacity-75' 
                        : 'bg-ac-sage-light text-ac-brown-dark border-ac-sage'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions Bar */}
          <div className="px-4 py-3 border-t-3 border-ac-peach-light bg-gradient-to-r from-ac-cream to-ac-peach-light/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Reactions */}
                <div className="relative">
                  <button
                    onClick={handleToggleReactions}
                    className="flex items-center space-x-2 text-ac-brown hover:text-ac-coral transition-colors duration-150 tactile-element"
                  >
                    <span className="text-xl">{leaf.user_reaction ? REACTION_EMOJIS[leaf.user_reaction] : '❤️'}</span>
                    {totalReactions > 0 && (
                      <span className="text-sm font-semibold bg-ac-coral/20 px-2 py-1 rounded-full">{totalReactions}</span>
                    )}
                  </button>
                  
                  {showReactions && (
                    <div className="absolute bottom-full left-0 mb-2 bg-surface shadow-large rounded-2xl p-3 flex space-x-2 border-3 border-ac-sage-light">
                      {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                        <button
                          key={type}
                          onClick={(e) => handleReaction(type as ReactionType, e)}
                          className="text-2xl hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-ac-peach-light tactile-element"
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
                  className="flex items-center space-x-2 text-ac-brown hover:text-ac-sky-dark transition-colors duration-150 tactile-element"
                >
                  <span className="text-xl">💬</span>
                  {leaf.comment_count > 0 && (
                    <span className="text-sm font-semibold bg-ac-sky/20 px-2 py-1 rounded-full">{leaf.comment_count}</span>
                  )}
                </button>

                {/* Share Count */}
                {leaf.share_count > 0 && (
                  <div className="flex items-center space-x-2 text-ac-brown-light">
                    <span className="text-sm">🔗</span>
                    <span className="text-sm font-medium">{leaf.share_count}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-ac-brown-light font-display">
                🌳 {leaf.tree_name} • 🌿 {leaf.branch?.name}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="border-t-3 border-ac-sage-light bg-ac-cream/50">
              <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                {leaf.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 p-3 bg-surface rounded-xl border-2 border-ac-peach-light">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-semibold text-ac-brown-dark font-display">{comment.profiles.first_name}</span>
                        <span className="text-ac-brown-light">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-ac-brown text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleComment} className="p-4 border-t-2 border-ac-sage-light">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 border-3 border-ac-sage-light rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-3 focus:ring-ac-sage focus:border-ac-sage bg-surface text-ac-brown-dark font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-6 py-2 bg-ac-sage text-ac-brown-dark rounded-full text-sm font-semibold hover:bg-ac-sage-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 border-3 border-ac-sage-dark shadow-md tactile-element font-display"
                  >
                    Send 🌿
                  </button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </animated.div>
    </div>
  )
})

export default LeafCard