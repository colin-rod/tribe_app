/**
 * Store Creator
 * Provides consistent patterns for state management with React hooks
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { errorHandler } from '@/lib/errors'

export interface StoreState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface StoreActions<T> {
  setData: (data: T | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  refresh: () => Promise<void>
}

export interface StoreConfig<T> {
  initialData?: T | null
  fetchFn?: () => Promise<T>
  onError?: (error: Error) => void
  autoFetch?: boolean
}

const createInitialState = <T>(initialData?: T | null): StoreState<T> => ({
  data: initialData || null,
  loading: false,
  error: null,
  lastUpdated: null
})

/**
 * Creates a custom hook for managing state with consistent patterns
 */
export function createStore<T>(config: StoreConfig<T> = {}) {
  const {
    initialData,
    fetchFn,
    onError,
    autoFetch = false
  } = config

  return function useStore(): StoreState<T> & StoreActions<T> {
    const [state, setState] = useState<StoreState<T>>(() => createInitialState(initialData))
    const mountedRef = useRef(true)

    // Actions
    const setData = useCallback((data: T | null) => {
      if (!mountedRef.current) return
      setState(prev => ({
        ...prev,
        data,
        lastUpdated: new Date(),
        error: null
      }))
    }, [])

    const setLoading = useCallback((loading: boolean) => {
      if (!mountedRef.current) return
      setState(prev => ({ ...prev, loading }))
    }, [])

    const setError = useCallback((error: string | null) => {
      if (!mountedRef.current) return
      setState(prev => ({
        ...prev,
        error,
        loading: false
      }))
    }, [])

    const reset = useCallback(() => {
      if (!mountedRef.current) return
      setState(createInitialState(initialData))
    }, [initialData])

    const refresh = useCallback(async () => {
      if (!fetchFn || !mountedRef.current) return

      setLoading(true)
      setError(null)

      try {
        const result = await fetchFn()
        setData(result)
      } catch (error) {
        const appError = errorHandler.handle(error, { logError: true })
        setError(appError.message)
        
        if (onError) {
          onError(appError)
        }
      } finally {
        setLoading(false)
      }
    }, [fetchFn, onError, setData, setError, setLoading])

    // Auto-fetch on mount
    useEffect(() => {
      if (autoFetch && fetchFn) {
        refresh()
      }
    }, [autoFetch, fetchFn, refresh])

    // Cleanup
    useEffect(() => {
      return () => {
        mountedRef.current = false
      }
    }, [])

    return {
      ...state,
      setData,
      setLoading,
      setError,
      reset,
      refresh
    }
  }
}

/**
 * Creates a store for paginated data
 */
export interface PaginatedStoreState<T> extends Omit<StoreState<T[]>, 'data'> {
  data: T[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface PaginatedStoreActions<T> extends Omit<StoreActions<T[]>, 'setData'> {
  setData: (data: T[], total?: number, hasMore?: boolean) => void
  loadMore: () => Promise<void>
  setPage: (page: number) => void
  setLimit: (limit: number) => void
}

export interface PaginatedStoreConfig<T> extends Omit<StoreConfig<T[]>, 'fetchFn'> {
  fetchFn?: (page: number, limit: number) => Promise<{
    data: T[]
    total: number
    hasMore: boolean
  }>
  initialPage?: number
  initialLimit?: number
}

export function createPaginatedStore<T>(config: PaginatedStoreConfig<T> = {}) {
  const {
    fetchFn,
    onError,
    autoFetch = false,
    initialPage = 1,
    initialLimit = 20
  } = config

  return function usePaginatedStore(): PaginatedStoreState<T> & PaginatedStoreActions<T> {
    const [state, setState] = useState<PaginatedStoreState<T>>({
      data: [],
      loading: false,
      error: null,
      lastUpdated: null,
      page: initialPage,
      limit: initialLimit,
      total: 0,
      hasMore: false
    })

    const mountedRef = useRef(true)

    const setData = useCallback((data: T[], total = 0, hasMore = false) => {
      if (!mountedRef.current) return
      setState(prev => ({
        ...prev,
        data,
        total,
        hasMore,
        lastUpdated: new Date(),
        error: null
      }))
    }, [])

    const setLoading = useCallback((loading: boolean) => {
      if (!mountedRef.current) return
      setState(prev => ({ ...prev, loading }))
    }, [])

    const setError = useCallback((error: string | null) => {
      if (!mountedRef.current) return
      setState(prev => ({
        ...prev,
        error,
        loading: false
      }))
    }, [])

    const setPage = useCallback((page: number) => {
      if (!mountedRef.current) return
      setState(prev => ({ ...prev, page }))
    }, [])

    const setLimit = useCallback((limit: number) => {
      if (!mountedRef.current) return
      setState(prev => ({ ...prev, limit, page: 1 })) // Reset to page 1 when changing limit
    }, [])

    const refresh = useCallback(async () => {
      if (!fetchFn || !mountedRef.current) return

      setLoading(true)
      setError(null)

      try {
        const result = await fetchFn(1, state.limit) // Always start from page 1 on refresh
        setData(result.data, result.total, result.hasMore)
        setPage(1)
      } catch (error) {
        const appError = errorHandler.handle(error, { logError: true })
        setError(appError.message)
        
        if (onError) {
          onError(appError)
        }
      } finally {
        setLoading(false)
      }
    }, [fetchFn, state.limit, onError, setData, setError, setLoading, setPage])

    const loadMore = useCallback(async () => {
      if (!fetchFn || !mountedRef.current || state.loading || !state.hasMore) return

      const nextPage = state.page + 1
      setLoading(true)

      try {
        const result = await fetchFn(nextPage, state.limit)
        setState(prev => ({
          ...prev,
          data: [...prev.data, ...result.data],
          page: nextPage,
          total: result.total,
          hasMore: result.hasMore,
          lastUpdated: new Date(),
          loading: false,
          error: null
        }))
      } catch (error) {
        const appError = errorHandler.handle(error, { logError: true })
        setError(appError.message)
        
        if (onError) {
          onError(appError)
        }
      } finally {
        setLoading(false)
      }
    }, [fetchFn, state.page, state.limit, state.loading, state.hasMore, state.data, onError, setError])

    const reset = useCallback(() => {
      if (!mountedRef.current) return
      setState({
        data: [],
        loading: false,
        error: null,
        lastUpdated: null,
        page: initialPage,
        limit: initialLimit,
        total: 0,
        hasMore: false
      })
    }, [initialPage, initialLimit])

    // Auto-fetch on mount
    useEffect(() => {
      if (autoFetch && fetchFn) {
        refresh()
      }
    }, [autoFetch, fetchFn, refresh])

    // Cleanup
    useEffect(() => {
      return () => {
        mountedRef.current = false
      }
    }, [])

    return {
      ...state,
      setData,
      setLoading,
      setError,
      setPage,
      setLimit,
      reset,
      refresh,
      loadMore
    }
  }
}