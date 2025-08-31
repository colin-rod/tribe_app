import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Common test data factories
export const createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
})

export const createMockProfile = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  bio: null,
  family_role: 'parent' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const createMockTree = () => ({
  id: 'test-tree-id',
  name: 'Test Family Tree',
  description: 'A test tree',
  created_by: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  settings: {
    privacy_level: 'private' as const,
    allow_public_discovery: false,
    require_approval: true,
    auto_accept_family: true,
    email_notifications: true,
  },
})

export const createMockBranch = () => ({
  id: 'test-branch-id',
  tree_id: 'test-tree-id',
  name: 'Test Branch',
  description: 'A test branch',
  color: '#3B82F6',
  created_by: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  type: 'family' as const,
  privacy: 'private' as const,
  category: null,
  location: null,
  member_count: 1,
})

export const createMockLeaf = () => ({
  id: 'test-leaf-id',
  branch_id: 'test-branch-id',
  author_id: 'test-user-id',
  content: 'Test leaf content',
  media_urls: [],
  leaf_type: 'text' as const,
  milestone_type: null,
  milestone_date: null,
  tags: ['test'],
  season: null,
  ai_caption: null,
  ai_tags: [],
  thread_id: null,
  reply_to_id: null,
  conversation_context: null,
  message_type: 'post' as const,
  is_pinned: false,
  edited_at: null,
  assignment_status: 'assigned' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

// Mock handlers for common operations
export const mockQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return queryClient
}

// This file is a utility file, not a test file
// It provides test helpers for other test files