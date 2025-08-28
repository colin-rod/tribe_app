/**
 * Custom hook for managing leaf interactions (reactions, comments, shares)
 */

import { useCallback } from 'react'
import { ReactionType } from '@/types/database'
import { addLeafReaction, addLeafComment, shareLeafWithBranches } from '@/lib/leaves'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('useLeafInteractions')

interface UseLeafInteractionsProps {
  onRefresh?: () => Promise<void>
}

interface UseLeafInteractionsReturn {
  handleReaction: (leafId: string, reactionType: ReactionType) => Promise<boolean>
  handleComment: (leafId: string, comment: string) => Promise<boolean>
  handleShare: (leafId: string, branchIds: string[]) => Promise<boolean>
}

export function useLeafInteractions({ onRefresh }: UseLeafInteractionsProps = {}): UseLeafInteractionsReturn {
  
  const handleReaction = useCallback(async (leafId: string, reactionType: ReactionType): Promise<boolean> => {
    try {
      const success = await addLeafReaction(leafId, reactionType)
      
      if (success) {
        logger.info('Leaf reaction added successfully', {
          action: 'handleReaction',
          metadata: { leafId, reactionType }
        })
        
        // Refresh data if callback provided
        if (onRefresh) {
          await onRefresh()
        }
      }
      
      return success
    } catch (error) {
      logger.error('Failed to add leaf reaction', error, {
        action: 'handleReaction',
        metadata: { leafId, reactionType }
      })
      return false
    }
  }, [onRefresh])

  const handleComment = useCallback(async (leafId: string, comment: string): Promise<boolean> => {
    try {
      const success = await addLeafComment(leafId, comment)
      
      if (success) {
        logger.info('Leaf comment added successfully', {
          action: 'handleComment',
          metadata: { leafId, commentLength: comment.length }
        })
        
        // Refresh data if callback provided
        if (onRefresh) {
          await onRefresh()
        }
      }
      
      return success
    } catch (error) {
      logger.error('Failed to add leaf comment', error, {
        action: 'handleComment',
        metadata: { leafId }
      })
      return false
    }
  }, [onRefresh])

  const handleShare = useCallback(async (leafId: string, branchIds: string[]): Promise<boolean> => {
    try {
      const success = await shareLeafWithBranches(leafId, branchIds)
      
      if (success) {
        logger.info('Leaf shared successfully', {
          action: 'handleShare',
          metadata: { leafId, branchCount: branchIds.length }
        })
        
        // Refresh data if callback provided
        if (onRefresh) {
          await onRefresh()
        }
      }
      
      return success
    } catch (error) {
      logger.error('Failed to share leaf', error, {
        action: 'handleShare',
        metadata: { leafId, branchIds }
      })
      return false
    }
  }, [onRefresh])

  return {
    handleReaction,
    handleComment,
    handleShare
  }
}

export default useLeafInteractions