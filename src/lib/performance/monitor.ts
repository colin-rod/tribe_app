import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('PerformanceMonitor')

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: number
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 100 // Keep only last 100 metrics
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeObservers()
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return

    try {
      // Observe Core Web Vitals
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: entry.name,
            value: entry.value || 0,
            unit: 'ms',
            timestamp: Date.now(),
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          })
        }
      })

      // Observe different performance entry types
      const entryTypes = ['largest-contentful-paint', 'first-input', 'layout-shift']
      entryTypes.forEach(type => {
        try {
          vitalsObserver.observe({ entryTypes: [type] })
          this.observers.push(vitalsObserver)
        } catch (e) {
          logger.warn(`Performance observer for ${type} not supported`)
        }
      })

      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming
          this.recordMetric({
            name: 'page-load-time',
            value: navEntry.loadEventEnd - navEntry.navigationStart,
            unit: 'ms',
            timestamp: Date.now(),
            metadata: {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
              firstPaint: navEntry.responseEnd - navEntry.navigationStart
            }
          })
        }
      })

      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)

    } catch (error) {
      logger.warn('Performance monitoring not fully supported', error)
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log significant performance issues
    if (metric.name === 'page-load-time' && metric.value > 3000) {
      logger.warn('Slow page load detected', {
        metadata: { 
          loadTime: metric.value,
          ...metric.metadata 
        }
      })
    }

    if (metric.name === 'largest-contentful-paint' && metric.value > 2500) {
      logger.warn('Poor LCP detected', {
        metadata: { lcp: metric.value }
      })
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name)
    }
    return [...this.metrics]
  }

  getAverageMetric(name: string): number | null {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null
    
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
  }

  clearMetrics() {
    this.metrics = []
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.clearMetrics()
  }

  // Measure a function's execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await fn()
      const endTime = performance.now()
      
      this.recordMetric({
        name,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { 
          status: 'success',
          ...metadata 
        }
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      
      this.recordMetric({
        name,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata 
        }
      })
      
      throw error
    }
  }

  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const startTime = performance.now()
    
    try {
      const result = fn()
      const endTime = performance.now()
      
      this.recordMetric({
        name,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { 
          status: 'success',
          ...metadata 
        }
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      
      this.recordMetric({
        name,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        metadata: { 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          ...metadata 
        }
      })
      
      throw error
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number) {
    this.recordMetric({
      name: 'component-render',
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: { componentName }
    })

    // Warn about slow renders
    if (renderTime > 16) { // 60fps = 16.67ms per frame
      logger.warn('Slow component render detected', {
        metadata: { 
          componentName, 
          renderTime,
          fps: Math.round(1000 / renderTime)
        }
      })
    }
  }

  // Track memory usage
  trackMemoryUsage() {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return
    }

    const memory = (performance as any).memory
    this.recordMetric({
      name: 'memory-usage',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      timestamp: Date.now(),
      metadata: {
        totalHeapSize: memory.totalJSHeapSize,
        heapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      }
    })
  }

  // Get performance summary
  getSummary() {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000) // Last minute

    const summary = {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      averages: {} as Record<string, number>,
      warnings: [] as string[]
    }

    // Calculate averages for key metrics
    const keyMetrics = ['page-load-time', 'component-render', 'largest-contentful-paint']
    keyMetrics.forEach(metricName => {
      const avg = this.getAverageMetric(metricName)
      if (avg !== null) {
        summary.averages[metricName] = Math.round(avg)
      }
    })

    // Check for performance warnings
    if (summary.averages['page-load-time'] > 3000) {
      summary.warnings.push('Average page load time is slow')
    }
    if (summary.averages['component-render'] > 16) {
      summary.warnings.push('Average component render time is affecting 60fps')
    }
    if (summary.averages['largest-contentful-paint'] > 2500) {
      summary.warnings.push('Poor Largest Contentful Paint performance')
    }

    return summary
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [summary, setSummary] = React.useState(performanceMonitor.getSummary())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSummary(performanceMonitor.getSummary())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    summary,
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor),
    trackComponentRender: performanceMonitor.trackComponentRender.bind(performanceMonitor),
    trackMemoryUsage: performanceMonitor.trackMemoryUsage.bind(performanceMonitor)
  }
}

// React import (this will be resolved at build time)
import React from 'react'