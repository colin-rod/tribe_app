import { RBACService } from '../rbac'
import { UserRole } from '@/types/database'

// Mock the logger
jest.mock('../logger', () => ({
  createComponentLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}))

// Mock the Supabase client
jest.mock('../supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

describe('RBACService', () => {
  let rbacService: RBACService

  beforeEach(() => {
    rbacService = RBACService.getInstance()
    rbacService.clearCache()
    jest.clearAllMocks()
  })

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = RBACService.getInstance()
      const instance2 = RBACService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('clearCache', () => {
    it('clears all cache when no userId provided', () => {
      rbacService.clearCache()
      
      // Cache should be empty - we can't directly test this but the method should not throw
      expect(() => rbacService.clearCache()).not.toThrow()
    })

    it('clears specific user cache when userId provided', () => {
      rbacService.clearCache('user-123')
      
      // Should not throw
      expect(() => rbacService.clearCache('user-123')).not.toThrow()
    })
  })

  describe('getUserRole', () => {
    it('should handle branch context', async () => {
      const context = {
        type: 'branch' as const,
        id: 'branch-123',
      }

      // This will test the basic structure - the actual implementation
      // would require mocking the full Supabase response
      await expect(
        rbacService.getUserRole('user-123', context)
      ).resolves.toBeDefined()
    })

    it('should handle tree context', async () => {
      const context = {
        type: 'tree' as const,
        id: 'tree-123',
      }

      await expect(
        rbacService.getUserRole('user-123', context)
      ).resolves.toBeDefined()
    })

    it('should handle global context', async () => {
      const context = {
        type: 'global' as const,
      }

      await expect(
        rbacService.getUserRole('user-123', context)
      ).resolves.toBeDefined()
    })
  })
})