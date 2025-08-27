import type { SubscriptionPlan } from './database'

export interface PlanLimits {
  maxBranchInvites: number
  storageRetentionDays: number
  allowVideo: boolean
  allowSMS: boolean
  maxUploadSize: number // in MB
  maxBranches: number
  maxTreeMembers: number
  maxChildren: number
  maxAssistantThreads: number
  maxAssistantMessagesPerThread: number
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxBranchInvites: 10,
    storageRetentionDays: 90,
    allowVideo: false,
    allowSMS: false,
    maxUploadSize: 10, // 10MB
    maxBranches: 5,
    maxTreeMembers: 10,
    maxChildren: 3,
    maxAssistantThreads: 5,
    maxAssistantMessagesPerThread: 50
  },
  pro: {
    maxBranchInvites: -1, // unlimited
    storageRetentionDays: -1, // unlimited
    allowVideo: true,
    allowSMS: true,
    maxUploadSize: 100, // 100MB
    maxBranches: -1, // unlimited
    maxTreeMembers: -1, // unlimited
    maxChildren: -1, // unlimited
    maxAssistantThreads: -1, // unlimited
    maxAssistantMessagesPerThread: -1 // unlimited
  }
}

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan]
}

export function isWithinLimit(currentCount: number, limit: number): boolean {
  if (limit === -1) return true // unlimited
  return currentCount < limit
}

export function getRemainingLimit(currentCount: number, limit: number): number {
  if (limit === -1) return Infinity // unlimited
  return Math.max(0, limit - currentCount)
}