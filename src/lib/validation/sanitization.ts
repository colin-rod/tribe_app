/**
 * Input sanitization utilities to prevent XSS and other security issues
 */

// HTML entity mapping for basic XSS prevention
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;',
}

/**
 * Escapes HTML entities to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Sanitizes text input by trimming whitespace and escaping HTML
 */
export function sanitizeText(input: string, options: {
  maxLength?: number
  allowNewlines?: boolean
  trim?: boolean
} = {}): string {
  const {
    maxLength = 10000,
    allowNewlines = true,
    trim = true,
  } = options

  if (typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Trim whitespace if requested
  if (trim) {
    sanitized = sanitized.trim()
  }

  // Remove or replace newlines if not allowed
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ')
  }

  // Escape HTML entities
  sanitized = escapeHtml(sanitized)

  // Truncate if exceeds max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return ''
  }

  return email.trim().toLowerCase()
}

/**
 * Sanitizes URLs to prevent malicious links
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim()

  // Block javascript: and data: schemes
  const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i
  if (dangerousProtocols.test(trimmed)) {
    return ''
  }

  // Ensure URL starts with http:// or https://
  if (trimmed && !trimmed.match(/^https?:\/\//)) {
    return `https://${trimmed}`
  }

  return trimmed
}

/**
 * Sanitizes phone numbers by removing all non-digit characters except + and spaces
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return ''
  }

  return phone.replace(/[^\d\+\s\-\(\)]/g, '').trim()
}

/**
 * Sanitizes file names to prevent directory traversal and other issues
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return 'untitled'
  }

  return fileName
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255) // Limit length
    || 'untitled' // Fallback if empty
}

/**
 * Sanitizes search queries to prevent injection attacks
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return ''
  }

  return query
    .trim()
    .replace(/[<>'"`;\\]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 200) // Limit length
}

/**
 * Removes null bytes and other control characters
 */
export function removeControlCharacters(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove null bytes and other control characters (except newlines and tabs)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Comprehensive input sanitization for user-generated content
 */
export function sanitizeUserContent(content: string, options: {
  maxLength?: number
  allowNewlines?: boolean
  preserveFormatting?: boolean
} = {}): string {
  const {
    maxLength = 5000,
    allowNewlines = true,
    preserveFormatting = false,
  } = options

  if (typeof content !== 'string') {
    return ''
  }

  let sanitized = content

  // Remove control characters first
  sanitized = removeControlCharacters(sanitized)

  // Handle formatting preservation
  if (!preserveFormatting) {
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ')
  }

  // Apply standard text sanitization
  sanitized = sanitizeText(sanitized, {
    maxLength,
    allowNewlines,
    trim: true,
  })

  return sanitized
}

/**
 * Sanitizes JSON objects recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxStringLength?: number
    maxDepth?: number
    allowedKeys?: string[]
  } = {}
): T {
  const {
    maxStringLength = 1000,
    maxDepth = 10,
    allowedKeys,
  } = options

  function sanitizeValue(value: unknown, depth: number): unknown {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      return null
    }

    if (typeof value === 'string') {
      return sanitizeText(value, { maxLength: maxStringLength })
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, depth + 1)).slice(0, 100) // Limit array size
    }

    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {}
      
      for (const [key, val] of Object.entries(value)) {
        // Skip disallowed keys if allowlist is provided
        if (allowedKeys && !allowedKeys.includes(key)) {
          continue
        }

        // Sanitize key name
        const sanitizedKey = sanitizeText(key, { maxLength: 100 })
        if (sanitizedKey) {
          sanitized[sanitizedKey] = sanitizeValue(val, depth + 1)
        }
      }

      return sanitized
    }

    return value
  }

  return sanitizeValue(obj, 0) as T
}

/**
 * SQL injection prevention helpers
 */
export function escapeSqlIdentifier(identifier: string): string {
  // Basic SQL identifier escaping (for table/column names)
  return identifier.replace(/[^a-zA-Z0-9_]/g, '')
}

/**
 * Rate limiting key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9\-_:.]/g, '_').substring(0, 100)
}

/**
 * Cookie value sanitization
 */
export function sanitizeCookieValue(value: string): string {
  // Remove characters that are not allowed in cookies
  return value.replace(/[,;\s"\\]/g, '')
}

/**
 * Validation error message sanitization (for user display)
 */
export function sanitizeErrorMessage(message: string): string {
  return sanitizeText(message, { maxLength: 500 })
    .replace(/\b(password|token|secret|key)\b/gi, '[REDACTED]') // Hide sensitive info
}