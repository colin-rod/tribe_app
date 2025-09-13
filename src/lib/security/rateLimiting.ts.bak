/**
 * Production-ready rate limiting with Redis support
 * Fallback to in-memory for development
 */

import { NextRequest } from 'next/server'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('RateLimiting')

export interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  total: number
}

// In-memory cache for development (not suitable for production clusters)
const memoryCache = new Map<string, { count: number; resetTime: number }>()

/**
 * Redis-based rate limiter for production
 */
class RedisRateLimiter {
  private redis: any = null

  constructor() {
    this.initRedis()
  }

  private async initRedis() {
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      try {
        // Dynamic import to avoid issues if Redis isn't available
        const { Redis } = await import('ioredis')
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })
        
        await this.redis.connect()
        logger.info('Redis connected for rate limiting')
      } catch (error) {
        logger.error('Failed to connect to Redis, falling back to memory cache', error)
        this.redis = null
      }
    }
  }

  async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (this.redis) {
      return this.checkRedisLimit(key, config)
    } else {
      return this.checkMemoryLimit(key, config)
    }
  }

  private async checkRedisLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const windowStart = Math.floor(Date.now() / config.windowMs) * config.windowMs
    const windowKey = `ratelimit:${key}:${windowStart}`
    
    try {
      const pipeline = this.redis.pipeline()
      pipeline.incr(windowKey)
      pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results[0][1] as number
      
      const remaining = Math.max(0, config.maxRequests - count)
      const resetTime = windowStart + config.windowMs
      
      return {
        allowed: count <= config.maxRequests,
        remaining,
        resetTime,
        total: config.maxRequests
      }
    } catch (error) {
      logger.error('Redis rate limit check failed, allowing request', error, { key })
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        total: config.maxRequests
      }
    }
  }

  private checkMemoryLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs
    const resetTime = windowStart + config.windowMs
    
    // Clean up expired entries
    this.cleanupMemoryCache()
    
    const cacheKey = `${key}:${windowStart}`
    const current = memoryCache.get(cacheKey)
    
    if (!current) {
      memoryCache.set(cacheKey, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
        total: config.maxRequests
      }
    }
    
    current.count++
    const remaining = Math.max(0, config.maxRequests - current.count)
    
    return {
      allowed: current.count <= config.maxRequests,
      remaining,
      resetTime,
      total: config.maxRequests
    }
  }

  private cleanupMemoryCache() {
    const now = Date.now()
    for (const [key, value] of memoryCache.entries()) {
      if (value.resetTime < now) {
        memoryCache.delete(key)
      }
    }
  }

  async close() {
    if (this.redis) {
      await this.redis.disconnect()
    }
  }
}

// Singleton instance
const rateLimiter = new RedisRateLimiter()

/**
 * Default key generator based on IP address
 */
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0].trim() || realIP || req.ip || 'unknown'
  return `ip:${ip}`
}

/**
 * Rate limiting configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // General API calls
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests, please try again later'
  },
  
  // Authentication attempts
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later'
  },
  
  // File uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Too many file uploads, please try again later'
  },
  
  // Password reset requests
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset requests, please try again later'
  },
  
  // Invitation creation
  invitations: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many invitation requests, please try again later'
  },
  
  // Webhook endpoints
  webhooks: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Webhook rate limit exceeded'
  }
} as const

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  req: NextRequest,
  configName: keyof typeof RATE_LIMIT_CONFIGS | RateLimitConfig,
  customKeyGenerator?: (req: NextRequest) => string
): Promise<RateLimitResult> {
  const config = typeof configName === 'string' 
    ? RATE_LIMIT_CONFIGS[configName] 
    : configName

  const keyGenerator = customKeyGenerator || config.keyGenerator || defaultKeyGenerator
  const key = keyGenerator(req)
  
  const result = await rateLimiter.checkLimit(key, config)
  
  // Log rate limit violations
  if (!result.allowed) {
    logger.warn('Rate limit exceeded', {
      key,
      config: typeof configName === 'string' ? configName : 'custom',
      remaining: result.remaining,
      resetTime: new Date(result.resetTime).toISOString()
    })
  }
  
  return result
}

/**
 * Get rate limiting headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.total.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
  }
}

/**
 * User-based rate limiting (for authenticated requests)
 */
export function createUserKeyGenerator(userId: string) {
  return () => `user:${userId}`
}

/**
 * IP + User combined rate limiting
 */
export function createCombinedKeyGenerator(userId?: string) {
  return (req: NextRequest) => {
    const ip = defaultKeyGenerator(req)
    return userId ? `${ip}:user:${userId}` : ip
  }
}

/**
 * Endpoint-specific rate limiting
 */
export function createEndpointKeyGenerator(endpoint: string) {
  return (req: NextRequest) => {
    const ip = defaultKeyGenerator(req)
    return `${ip}:endpoint:${endpoint}`
  }
}

// Cleanup on process exit
process.on('SIGTERM', async () => {
  await rateLimiter.close()
})

process.on('SIGINT', async () => {
  await rateLimiter.close()
})