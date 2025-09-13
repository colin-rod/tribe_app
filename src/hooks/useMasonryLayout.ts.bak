import { useEffect, useRef, useState, useCallback } from 'react'

interface MasonryItem {
  id: string
  height?: number
}

interface MasonryLayout {
  columns: number
  gap: number
  itemWidth: number
}

interface MasonryPosition {
  x: number
  y: number
  width: number
  height: number
}

export function useMasonryLayout<T extends MasonryItem>(
  items: T[],
  containerWidth: number,
  minColumnWidth: number = 280,
  gap: number = 16
) {
  const [layout, setLayout] = useState<MasonryLayout>({ columns: 1, gap, itemWidth: 0 })
  const [positions, setPositions] = useState<Map<string, MasonryPosition>>(new Map())
  const [containerHeight, setContainerHeight] = useState(0)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Calculate column layout
  const calculateLayout = useCallback(() => {
    if (containerWidth <= 0) return

    const availableWidth = containerWidth
    const columns = Math.max(1, Math.floor((availableWidth + gap) / (minColumnWidth + gap)))
    const itemWidth = Math.floor((availableWidth - (columns - 1) * gap) / columns)

    setLayout({ columns, gap, itemWidth })
  }, [containerWidth, minColumnWidth, gap])

  // Calculate item positions using masonry algorithm
  const calculatePositions = useCallback(() => {
    if (layout.columns === 0 || items.length === 0) return

    const newPositions = new Map<string, MasonryPosition>()
    const columnHeights = new Array(layout.columns).fill(0)

    items.forEach((item) => {
      const element = itemRefs.current.get(item.id)
      const itemHeight = element?.offsetHeight || item.height || 300

      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
      const x = shortestColumnIndex * (layout.itemWidth + layout.gap)
      const y = columnHeights[shortestColumnIndex]

      newPositions.set(item.id, {
        x,
        y,
        width: layout.itemWidth,
        height: itemHeight
      })

      // Update column height
      columnHeights[shortestColumnIndex] += itemHeight + layout.gap
    })

    setPositions(newPositions)
    setContainerHeight(Math.max(...columnHeights) - layout.gap)
  }, [items, layout, itemRefs])

  // Update layout when container width changes
  useEffect(() => {
    calculateLayout()
  }, [calculateLayout])

  // Update positions when layout or items change
  useEffect(() => {
    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(calculatePositions, 50)
    return () => clearTimeout(timer)
  }, [calculatePositions])

  // Register item ref
  const registerItemRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(id, element)
    } else {
      itemRefs.current.delete(id)
    }
    // Recalculate positions when new items are registered
    setTimeout(calculatePositions, 0)
  }, [calculatePositions])

  // Force recalculation (useful for dynamic content loading)
  const recalculate = useCallback(() => {
    setTimeout(calculatePositions, 100)
  }, [calculatePositions])

  return {
    layout,
    positions,
    containerHeight,
    registerItemRef,
    recalculate
  }
}

// Hook for observing container resize
export function useContainerResize() {
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(() => {
      updateWidth()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return { containerRef, width }
}

// Intersection observer hook for infinite scroll
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean = true,
  threshold: number = 0.1
) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [loadMore, hasMore, threshold])

  return loadMoreRef
}