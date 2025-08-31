import { getUser, getUserProfile, requireAuth } from '../auth'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock the logger
jest.mock('../logger', () => ({
  createComponentLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}))

// Mock the Supabase server client
jest.mock('../supabase/server', () => ({
  createClient: jest.fn(),
}))

const { createClient } = jest.requireMock('../supabase/server')
const { redirect } = jest.requireMock('next/navigation')

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUser', () => {
    it('returns user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await getUser()

      expect(result).toEqual(mockUser)
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })

    it('returns null when not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await getUser()

      expect(result).toBeNull()
    })

    it('returns null when auth error occurs', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Auth error'),
          }),
        },
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await getUser()

      expect(result).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('returns user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await requireAuth()

      expect(result).toEqual(mockUser)
      expect(redirect).not.toHaveBeenCalled()
    })

    it('redirects to login when not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      createClient.mockResolvedValue(mockSupabase)

      await expect(requireAuth()).rejects.toThrow()
      expect(redirect).toHaveBeenCalledWith('/auth/login')
    })
  })

  describe('getUserProfile', () => {
    it('returns profile when user exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      }

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null,
        bio: null,
        family_role: 'parent',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await getUserProfile()

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('returns null when user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await getUserProfile()

      expect(result).toBeNull()
    })

    it('returns null when profile fetch fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Profile not found'),
          }),
        })),
      }

      createClient.mockResolvedValue(mockSupabase)

      const result = await getUserProfile()

      expect(result).toBeNull()
    })
  })
})