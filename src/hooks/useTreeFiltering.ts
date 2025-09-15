import { useMemo } from 'react'
import { LeafWithDetails } from '@/types/database'

export type FilterType = 'all' | 'milestones' | 'recent'

export interface UseTreeFilteringProps {
  leaves: LeafWithDetails[]
  filter: FilterType
}

export function useTreeFiltering({ leaves, filter }: UseTreeFilteringProps) {
  const filteredLeaves = useMemo(() => {
    if (!leaves?.length) return []

    switch (filter) {
      case 'milestones':
        return leaves.filter(leaf => leaf.milestone_type !== null)
      
      case 'recent':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return leaves.filter(leaf => new Date(leaf.created_at) > weekAgo)
      
      case 'all':
      default:
        return leaves
    }
  }, [leaves, filter])

  const filterStats = useMemo(() => {
    if (!leaves?.length) {
      return {
        total: 0,
        milestones: 0,
        recent: 0,
        filtered: 0
      }
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    return {
      total: leaves.length,
      milestones: leaves.filter(leaf => leaf.milestone_type !== null).length,
      recent: leaves.filter(leaf => new Date(leaf.created_at) > weekAgo).length,
      filtered: filteredLeaves.length
    }
  }, [leaves, filteredLeaves])

  const getFilterLabel = (filterType: FilterType): string => {
    switch (filterType) {
      case 'milestones':
        return `Milestones (${filterStats.milestones})`
      case 'recent':
        return `Recent (${filterStats.recent})`
      case 'all':
      default:
        return `All Memories (${filterStats.total})`
    }
  }

  const getNextFilter = (currentFilter: FilterType): FilterType => {
    switch (currentFilter) {
      case 'all':
        return 'recent'
      case 'recent':
        return 'milestones'
      case 'milestones':
      default:
        return 'all'
    }
  }

  return {
    filteredLeaves,
    filterStats,
    getFilterLabel,
    getNextFilter
  }
}