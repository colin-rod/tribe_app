/**
 * Custom hook for managing tree data fetching and caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { LeafWithDetails } from '@/types/database'
import { getTreeLeaves, getTreeStats } from '@/lib/leaves'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('useTreeData')

interface TreeStats {
  totalLeaves: number
  milestoneCount: number
  recentLeaves: number
  leafTypeBreakdown: { [key: string]: number }
  seasonBreakdown: { [key: string]: number }
}

interface UseTreeDataReturn {
  leaves: LeafWithDetails[]
  stats: TreeStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

const DEFAULT_STATS: TreeStats = {
  totalLeaves: 0,
  milestoneCount: 0,
  recentLeaves: 0,
  leafTypeBreakdown: {},
  seasonBreakdown: {}
}

// Cache for tree data to prevent unnecessary requests
const treeDataCache = new Map<string, {
  leaves: LeafWithDetails[]
  stats: TreeStats
  timestamp: number
}>()

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useTreeData(treeId: string | null, initialLimit = 20): UseTreeDataReturn {
  const [leaves, setLeaves] = useState<LeafWithDetails[]>([])
  const [stats, setStats] = useState<TreeStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Check if we have cached data
  const getCachedData = useCallback((id: string) => {
    const cached = treeDataCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached
    }
    return null
  }, [])

  // Cache data
  const setCachedData = useCallback((id: string, data: { leaves: LeafWithDetails[], stats: TreeStats }) => {
    treeDataCache.set(id, {
      ...data,
      timestamp: Date.now()
    })
  }, [])

  const fetchTreeData = useCallback(async (id: string, isRefresh = false) => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      // Check cache first for initial load
      if (!isRefresh) {
        const cached = getCachedData(id)
        if (cached) {
          setLeaves(cached.leaves)
          setStats(cached.stats)
          setLoading(false)
          logger.debug('Loaded tree data from cache', { 
            action: 'fetchTreeData', 
            metadata: { treeId: id, leavesCount: cached.leaves.length }
          })
          return
        }
      }

      // Fetch fresh data in parallel
      const [treeLeaves, treeStats] = await Promise.all([
        getTreeLeaves(id, initialLimit, 0),
        getTreeStats(id)
      ])

      setLeaves(treeLeaves)
      setStats(treeStats)
      setOffset(initialLimit)
      setHasMore(treeLeaves.length === initialLimit)

      // Cache the data
      setCachedData(id, { leaves: treeLeaves, stats: treeStats })

      logger.info('Tree data loaded successfully', {
        action: 'fetchTreeData',
        metadata: { 
          treeId: id, 
          leavesCount: treeLeaves.length,
          fromCache: false
        }
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tree data'
      setError(errorMessage)
      logger.error('Failed to fetch tree data', err, { 
        action: 'fetchTreeData', 
        metadata: { treeId: id }
      })
    } finally {
      setLoading(false)
    }
  }, [initialLimit, getCachedData, setCachedData])

  const loadMore = useCallback(async () => {
    if (!treeId || loading || !hasMore) return

    setLoading(true)
    try {
      const moreLeaves = await getTreeLeaves(treeId, initialLimit, offset)
      
      if (moreLeaves.length > 0) {
        setLeaves(prev => [...prev, ...moreLeaves])
        setOffset(prev => prev + initialLimit)
        setHasMore(moreLeaves.length === initialLimit)
      } else {
        setHasMore(false)
      }

      logger.debug('Loaded more leaves', {
        action: 'loadMore',
        metadata: { treeId, newLeavesCount: moreLeaves.length, totalOffset: offset }
      })

    } catch (err) {
      logger.error('Failed to load more leaves', err, { 
        action: 'loadMore', 
        metadata: { treeId }
      })
    } finally {
      setLoading(false)
    }
  }, [treeId, loading, hasMore, initialLimit, offset])

  const refetch = useCallback(async () => {
    if (treeId) {
      setOffset(0)
      await fetchTreeData(treeId, true)
    }
  }, [treeId, fetchTreeData])

  // Load data when treeId changes
  useEffect(() => {
    if (treeId) {
      fetchTreeData(treeId)
    } else {
      setLeaves([])
      setStats(DEFAULT_STATS)
      setOffset(0)
      setHasMore(true)
    }
  }, [treeId, fetchTreeData])

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(() => ({
    leaves,
    stats,
    loading,
    error,
    refetch,
    loadMore,
    hasMore
  }), [leaves, stats, loading, error, refetch, loadMore, hasMore])
}

export default useTreeData