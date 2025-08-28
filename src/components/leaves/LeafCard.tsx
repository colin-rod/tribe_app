'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import Image from 'next/image'
import { LeafWithDetails, ReactionType } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

interface LeafCardProps {
  leaf: LeafWithDetails
  onReaction: (leafId: string, reactionType: ReactionType) => void
  onShare: (leafId: string, branchIds: string[]) => void
  onComment: (leafId: string, comment: string) => void
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

const LeafCard = memo(function LeafCard({ leaf, onReaction, onShare, onComment, className = '' }: LeafCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [showReactions, setShowReactions] = useState(false)

  const handleReaction = useCallback((reactionType: ReactionType) => {
    onReaction(leaf.id, reactionType)
    setShowReactions(false)
  }, [leaf.id, onReaction])

  const handleComment = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      onComment(leaf.id, newComment.trim())
      setNewComment('')
    }
  }, [leaf.id, newComment, onComment])

  const handleToggleComments = useCallback(() => {
    setShowComments(prev => !prev)
  }, [])

  const handleToggleReactions = useCallback(() => {
    setShowReactions(prev => !prev)
  }, [])

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

  return (
    <div className={`leaf-card bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {leaf.author_avatar && (
              <Image 
                src={leaf.author_avatar} 
                alt={leaf.author_name || ''} 
                width={40} 
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{leaf.author_name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{leafTypeIcon}</span>
                <span>{formattedDate}</span>
                {leaf.season && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    {leaf.season}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {leaf.milestone_type && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              <span>{leaf.milestone_icon}</span>
              <span className="font-medium">{leaf.milestone_display_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      {leaf.media_urls && leaf.media_urls.length > 0 && (
        <div className="relative">
          {leaf.leaf_type === 'photo' && (
            <div className="aspect-square relative bg-gray-100">
              <Image
                src={leaf.media_urls[0]}
                alt="Memory photo"
                fill
                className="object-cover"
              />
              {leaf.media_urls.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
                  +{leaf.media_urls.length - 1}
                </div>
              )}
            </div>
          )}
          
          {leaf.leaf_type === 'video' && (
            <div className="aspect-video relative bg-gray-100 flex items-center justify-center">
              <div className="text-6xl text-gray-400">🎥</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70 transition-colors">
                  ▶
                </button>
              </div>
            </div>
          )}
          
          {leaf.leaf_type === 'audio' && (
            <div className="aspect-[3/1] relative bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <div className="text-4xl">🎵</div>
              <button className="ml-4 bg-white/80 text-purple-700 px-4 py-2 rounded-full hover:bg-white transition-colors">
                ▶ Play Recording
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {(leaf.content || leaf.ai_caption) && (
          <div className="space-y-2">
            {leaf.content && (
              <p className="text-gray-900 leading-relaxed">{leaf.content}</p>
            )}
            {leaf.ai_caption && leaf.ai_caption !== leaf.content && (
              <p className="text-gray-600 italic text-sm border-l-2 border-blue-200 pl-3">
                AI: {leaf.ai_caption}
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
                className={`px-2 py-1 rounded-full text-xs ${
                  isAI 
                    ? 'bg-gray-100 text-gray-600 opacity-75' 
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Reactions */}
            <div className="relative">
              <button
                onClick={handleToggleReactions}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                <span className="text-lg">{leaf.user_reaction ? REACTION_EMOJIS[leaf.user_reaction] : '❤️'}</span>
                {totalReactions > 0 && (
                  <span className="text-sm font-medium">{totalReactions}</span>
                )}
              </button>
              
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 bg-white shadow-lg rounded-lg p-2 flex space-x-2 border">
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type as ReactionType)}
                      className="text-xl hover:scale-125 transition-transform p-1"
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
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors"
            >
              <span className="text-lg">💬</span>
              {leaf.comment_count > 0 && (
                <span className="text-sm font-medium">{leaf.comment_count}</span>
              )}
            </button>

            {/* Share Count */}
            {leaf.share_count > 0 && (
              <div className="flex items-center space-x-2 text-gray-500">
                <span className="text-sm">🔗</span>
                <span className="text-sm">{leaf.share_count}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400">
            {leaf.tree_name} • {leaf.branch?.name}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 bg-white">
          <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
            {leaf.comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-900">{comment.profiles.first_name}</span>
                    <span className="text-gray-500">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <form onSubmit={handleComment} className="p-4 border-t border-gray-100">
            <div className="flex space-x-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
})

export default LeafCard