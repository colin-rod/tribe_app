'use client'

import React, { useState, useEffect } from 'react'
import { LeafWithDetails, Milestone, ReactionType } from '@/types/database'
import LeafCard from './LeafCard'
import { formatDistanceToNow, format, isThisYear } from 'date-fns'

interface TreeTimelineProps {
  treeId: string
  treeName: string
  leaves: LeafWithDetails[]
  milestones: Milestone[]
  onReaction: (leafId: string, reactionType: ReactionType) => void
  onShare: (leafId: string, branchIds: string[]) => void
  onComment: (leafId: string, comment: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
}

interface TimelinePeriod {
  period: string
  displayName: string
  leaves: LeafWithDetails[]
  color: string
  icon: string
}

export default function TreeTimeline({
  treeId,
  treeName,
  leaves,
  milestones,
  onReaction,
  onShare,
  onComment,
  onLoadMore,
  hasMore = false,
  isLoading = false
}: TreeTimelineProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'seasons' | 'milestones'>('timeline')
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [selectedMilestoneType, setSelectedMilestoneType] = useState<string | null>(null)

  // Group leaves by different criteria
  const groupedLeaves = React.useMemo(() => {
    if (viewMode === 'seasons') {
      return groupBySeason(leaves)
    } else if (viewMode === 'milestones') {
      return groupByMilestoneType(leaves, milestones)
    } else {
      return groupByTimePeriod(leaves)
    }
  }, [leaves, viewMode, milestones])

  const milestoneStats = React.useMemo(() => {
    const total = leaves.length
    const milestoneCount = leaves.filter(leaf => leaf.milestone_type).length
    const recentLeaves = leaves.filter(leaf => {
      const leafDate = new Date(leaf.created_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return leafDate > weekAgo
    }).length

    return { total, milestoneCount, recentLeaves }
  }, [leaves])

  function groupByTimePeriod(leaves: LeafWithDetails[]): TimelinePeriod[] {
    const periods: { [key: string]: LeafWithDetails[] } = {}
    
    leaves.forEach(leaf => {
      const date = new Date(leaf.created_at)
      let periodKey: string
      let displayName: string
      
      if (isThisYear(date)) {
        const month = format(date, 'MMMM yyyy')
        periodKey = format(date, 'yyyy-MM')
        displayName = month
      } else {
        const year = format(date, 'yyyy')
        periodKey = year
        displayName = year
      }
      
      if (!periods[periodKey]) {
        periods[periodKey] = []
      }
      periods[periodKey].push(leaf)
    })

    return Object.entries(periods)
      .map(([period, leaves]) => ({
        period,
        displayName: periods[period] ? format(new Date(period + '-01'), 'MMMM yyyy') : period,
        leaves: leaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        color: 'bg-blue-500',
        icon: '📅'
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
  }

  function groupBySeason(leaves: LeafWithDetails[]): TimelinePeriod[] {
    const seasons: { [key: string]: LeafWithDetails[] } = {}
    
    leaves.forEach(leaf => {
      const season = leaf.season || 'unorganized'
      if (!seasons[season]) {
        seasons[season] = []
      }
      seasons[season].push(leaf)
    })

    const seasonConfig: { [key: string]: { displayName: string; color: string; icon: string } } = {
      'first_year': { displayName: 'First Year', color: 'bg-pink-500', icon: '👶' },
      'toddler': { displayName: 'Toddler Years', color: 'bg-orange-500', icon: '🧸' },
      'preschool': { displayName: 'Preschool', color: 'bg-green-500', icon: '🎒' },
      'school_age': { displayName: 'School Age', color: 'bg-blue-500', icon: '📚' },
      'holiday': { displayName: 'Holidays & Events', color: 'bg-purple-500', icon: '🎉' },
      'unorganized': { displayName: 'Other Memories', color: 'bg-gray-500', icon: '💭' }
    }

    return Object.entries(seasons).map(([season, leaves]) => ({
      period: season,
      displayName: seasonConfig[season]?.displayName || season,
      leaves: leaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      color: seasonConfig[season]?.color || 'bg-gray-500',
      icon: seasonConfig[season]?.icon || '🌿'
    }))
  }

  function groupByMilestoneType(leaves: LeafWithDetails[], milestones: Milestone[]): TimelinePeriod[] {
    const milestoneGroups: { [key: string]: LeafWithDetails[] } = {}
    
    leaves.filter(leaf => leaf.milestone_type).forEach(leaf => {
      const milestoneType = leaf.milestone_type!
      if (!milestoneGroups[milestoneType]) {
        milestoneGroups[milestoneType] = []
      }
      milestoneGroups[milestoneType].push(leaf)
    })

    return Object.entries(milestoneGroups).map(([type, leaves]) => {
      const milestone = milestones.find(m => m.name === type)
      return {
        period: type,
        displayName: milestone?.display_name || type.replace('_', ' '),
        leaves: leaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        color: milestone?.color || 'bg-yellow-500',
        icon: milestone?.icon || '⭐'
      }
    })
  }

  const renderTimelineHeader = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">{treeName}&apos;s Memory Tree</h1>
          <span className="text-3xl">🌳</span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{milestoneStats.total}</div>
            <div>Total Leaves</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{milestoneStats.milestoneCount}</div>
            <div>Milestones</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{milestoneStats.recentLeaves}</div>
            <div>This Week</div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 mr-2">View by:</span>
        {[
          { mode: 'timeline', label: 'Time', icon: '📅' },
          { mode: 'seasons', label: 'Seasons', icon: '🌱' },
          { mode: 'milestones', label: 'Milestones', icon: '⭐' }
        ].map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as 'timeline' | 'seasons' | 'milestones')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const renderTimelinePeriod = (period: TimelinePeriod, index: number) => (
    <div key={period.period} className="mb-8">
      {/* Period Header */}
      <div className="flex items-center mb-4">
        <div className={`w-12 h-12 ${period.color} rounded-full flex items-center justify-center text-white text-xl mr-4`}>
          {period.icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{period.displayName}</h2>
          <p className="text-sm text-gray-500">{period.leaves.length} leaves</p>
        </div>
      </div>

      {/* Timeline Line */}
      {index < groupedLeaves.length - 1 && (
        <div className="absolute left-6 mt-4 w-0.5 bg-gray-200 h-8"></div>
      )}

      {/* Leaves Grid */}
      <div className="ml-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {period.leaves.map((leaf) => (
          <LeafCard
            key={leaf.id}
            leaf={leaf}
            onReaction={onReaction}
            onShare={onShare}
            onComment={onComment}
            className="transform hover:scale-105 transition-transform duration-200"
          />
        ))}
      </div>
    </div>
  )

  const renderSeasonView = () => (
    <div className="space-y-6">
      {groupedLeaves.map((period, index) => (
        <div key={period.period} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div 
            className={`${period.color} px-6 py-4 text-white cursor-pointer`}
            onClick={() => setSelectedSeason(selectedSeason === period.period ? null : period.period)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{period.icon}</span>
                <h3 className="text-lg font-semibold">{period.displayName}</h3>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm opacity-90">{period.leaves.length} leaves</span>
                <span className={`transform transition-transform ${selectedSeason === period.period ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </div>
          </div>
          
          {(selectedSeason === period.period || selectedSeason === null) && (
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {period.leaves.map((leaf) => (
                  <LeafCard
                    key={leaf.id}
                    leaf={leaf}
                    onReaction={onReaction}
                    onShare={onShare}
                    onComment={onComment}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🌱</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No leaves yet</h3>
      <p className="text-gray-600 mb-6">Start capturing precious memories to grow this tree!</p>
      <button className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
        Create First Leaf 🌿
      </button>
    </div>
  )

  if (leaves.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {renderTimelineHeader()}
        {renderEmptyState()}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderTimelineHeader()}
      
      <div className="relative">
        {viewMode === 'seasons' ? (
          renderSeasonView()
        ) : (
          <div className="space-y-8">
            {groupedLeaves.map((period, index) => renderTimelinePeriod(period, index))}
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Loading more leaves...' : 'Load More Memories 🌿'}
          </button>
        </div>
      )}

      {/* Growth Progress Indicator */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Tree Growth</h3>
            <p className="text-gray-600">Your memory tree is flourishing!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{leaves.length}</div>
            <div className="text-sm text-gray-500">leaves collected</div>
          </div>
        </div>
        
        {/* Growth visualization */}
        <div className="mt-4 flex items-end justify-center space-x-2 h-12">
          {Array.from({ length: Math.min(12, Math.ceil(leaves.length / 5)) }).map((_, i) => (
            <div
              key={i}
              className="bg-green-400 rounded-t-full animate-pulse"
              style={{ 
                width: '8px', 
                height: `${Math.random() * 30 + 20}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}