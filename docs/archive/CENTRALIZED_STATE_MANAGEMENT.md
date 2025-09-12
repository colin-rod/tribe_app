# Centralized State Management Migration Guide

This document outlines the new centralized state management system using TanStack Query (React Query) that replaces manual state management patterns.

## Overview

We've implemented TanStack Query to provide:
- **Centralized data fetching** with automatic caching
- **Background updates** and synchronization
- **Optimistic updates** for better UX
- **Error handling** and retry logic
- **Loading states** management
- **Data invalidation** strategies

## Architecture

### Query Client Setup
- **Location**: `src/lib/query-client.ts`
- **Provider**: `src/providers/query-provider.tsx`
- **Configuration**: Optimized defaults for caching, retries, and background updates

### Query Key Factory
Consistent query keys are defined in `src/lib/query-client.ts`:

```typescript
export const queryKeys = {
  trees: {
    all: ['trees'],
    byUser: (userId: string) => ['trees', 'user', userId],
    byId: (treeId: string) => ['trees', 'detail', treeId],
    // ... more keys
  },
  // ... other entities
}
```

## Custom Hooks

### Tree Hooks (`src/hooks/use-trees.ts`)
```typescript
// Query hooks
const { data: trees, isLoading, error } = useUserTrees(userId)
const { data: tree } = useTree(treeId)
const { data: treeStats } = useTreeStats(treeId)

// Mutation hooks
const createTreeMutation = useCreateTree()
const updateTreeMutation = useUpdateTree()
```

### Branch Hooks (`src/hooks/use-branches.ts`)
```typescript
// Query hooks
const { data: branches } = useBranchesByTree(treeId)
const { data: userBranches } = useUserBranches(userId)
const { data: branchPermissions } = useBranchPermissions(userId, branchId)

// Mutation hooks
const createBranchMutation = useCreateBranch()
```

### Leaf Hooks (`src/hooks/use-leaves.ts`)
```typescript
// Query hooks
const { data: leaves } = useTreeLeaves(treeId)
const { data: unassignedLeaves } = useUnassignedLeaves(userId)

// Mutation hooks with optimistic updates
const addReactionMutation = useAddLeafReaction()
const assignLeafMutation = useAssignLeafToBranches()
```

### User Hooks (`src/hooks/use-users.ts`)
```typescript
// Query hooks
const { data: user } = useCurrentUser()
const { data: profile } = useUserProfile(userId)
const { data: settings } = useUserSettings(userId)

// Mutation hooks
const updateProfileMutation = useUpdateUserProfile()
```

## Migration Examples

### Before (Manual State Management)
```typescript
// ❌ Old pattern
const [trees, setTrees] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  const loadTrees = async () => {
    try {
      setLoading(true)
      const userTrees = await getUserTrees(userId)
      setTrees(userTrees)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  loadTrees()
}, [userId])
```

### After (React Query)
```typescript
// ✅ New pattern
const { data: treesData, isLoading, error } = useUserTrees(userId)
const trees = treesData?.data || []
```

### Mutation Examples

#### Before (Manual Updates)
```typescript
// ❌ Old pattern
const handleReaction = async (leafId, reactionType) => {
  try {
    const success = await addLeafReaction(leafId, reactionType)
    if (success) {
      // Manually refetch all data
      const updatedLeaves = await getTreeLeaves(treeId)
      setLeaves(updatedLeaves)
    }
  } catch (error) {
    console.error(error)
  }
}
```

#### After (Optimistic Updates)
```typescript
// ✅ New pattern
const addReactionMutation = useAddLeafReaction()

const handleReaction = (leafId, reactionType) => {
  addReactionMutation.mutate({ leafId, reactionType })
  // Optimistic update and cache invalidation handled automatically
}
```

## Key Benefits

### 1. Automatic Caching
- Data is cached and shared across components
- Reduces redundant API calls
- Background updates keep data fresh

### 2. Optimistic Updates
```typescript
// Reactions appear immediately, rollback on error
const useAddLeafReaction = () => {
  return useMutation({
    mutationFn: addLeafReaction,
    onMutate: async ({ leafId, reactionType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leaves.all })
      
      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.leaves.all })
      
      // Optimistically update
      queryClient.setQueriesData({ queryKey: queryKeys.leaves.all }, (old) => {
        // Add reaction immediately
        return updateLeafWithReaction(old, leafId, reactionType)
      })
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueriesData(context.previousData)
    },
    onSuccess: () => {
      // Refetch for accuracy
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all })
    }
  })
}
```

### 3. Consistent Error Handling
- Global error handling in mutations
- Toast notifications for user feedback
- Retry logic for network failures

### 4. Loading States
```typescript
const { data, isLoading, isFetching, error } = useTreeLeaves(treeId)

if (isLoading) return <Spinner />
if (error) return <ErrorMessage error={error} />
return <LeavesList leaves={data} />
```

## Performance Optimizations

### 1. Selective Enablement
```typescript
// Only fetch when conditions are met
const { data } = useTreeLeaves(treeId, { limit: 50 }, !!treeId && userCanView)
```

### 2. Stale Time Configuration
```typescript
// Cache user preferences for 5 minutes
staleTime: 5 * 60 * 1000
```

### 3. Prefetching
```typescript
// Prefetch related data
await prefetchQueries.treeDetails(treeId)
```

## Development Tools

### React Query Devtools
- Available in development mode
- Inspect cache state
- View query timeline
- Debug performance issues

## Best Practices

### 1. Use Consistent Query Keys
```typescript
// ✅ Good
queryKeys.trees.byUser(userId)

// ❌ Bad
['trees', userId, 'user']
```

### 2. Handle Loading States
```typescript
// ✅ Good
if (isLoading) return <LoadingSpinner />
if (error) return <ErrorBoundary error={error} />

// ❌ Bad - ignoring loading states
```

### 3. Optimistic Updates for UX
```typescript
// ✅ Good for user interactions (likes, comments)
onMutate: async () => {
  // Immediate UI update
}

// ❌ Bad - waiting for server response for every interaction
```

### 4. Invalidate Related Data
```typescript
onSuccess: () => {
  // Invalidate related queries
  queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byTree(treeId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.trees.stats(treeId) })
}
```

## Migration Checklist

- [ ] Install TanStack Query dependencies
- [ ] Set up QueryProvider in app layout
- [ ] Replace useState/useEffect patterns with custom hooks
- [ ] Add optimistic updates for user interactions
- [ ] Implement proper error handling
- [ ] Remove manual cache management code
- [ ] Test loading states and error boundaries
- [ ] Add prefetching for critical paths

## Future Enhancements

1. **Infinite Queries** for large datasets
2. **Suspense** integration for better loading UX
3. **Offline Support** with background sync
4. **Real-time Updates** with WebSocket integration
5. **Persisted Queries** for offline-first experience

## Troubleshooting

### Common Issues

1. **Stale Closures**: Use query client methods instead of local state
2. **Memory Leaks**: Proper cleanup in useEffect
3. **Over-fetching**: Use selective enablement
4. **Cache Invalidation**: Use proper query key patterns

### Debug Tips

1. Enable React Query Devtools
2. Use query key factory consistently
3. Check network tab for redundant requests
4. Monitor cache size and GC behavior