# Input Validation & Security System

This comprehensive validation and security system provides protection against common web vulnerabilities including XSS, SQL injection, and data validation errors.

## Overview

The validation system consists of four main components:

1. **Schemas** (`schemas.ts`) - Zod validation schemas for all data types
2. **Sanitization** (`sanitization.ts`) - Input sanitization utilities  
3. **Form Hooks** (`../hooks/useFormValidation.ts`) - React hooks for form validation
4. **API Middleware** (`middleware.ts`) - Server-side validation middleware
5. **Error Handling** (`errors.ts`) - Structured error handling and user-friendly messages

## Quick Start

### 1. Form Validation

```typescript
import { useFormValidation } from '@/hooks/useFormValidation'
import { profileUpdateSchema } from '@/lib/validation/schemas'

function ProfileForm() {
  const { errors, isValid, validate, validateField } = useFormValidation({
    schema: profileUpdateSchema,
    sanitize: true,
  })

  const handleSubmit = (formData) => {
    const result = validate(formData)
    if (result.success) {
      // Submit validated data
      submitProfile(result.data)
    }
  }

  return (
    <input
      onChange={(e) => validateField('email', e.target.value)}
      className={errors.email ? 'border-red-300' : 'border-gray-300'}
    />
    {errors.email && <span className="text-red-600">{errors.email}</span>}
  )
}
```

### 2. API Route Protection

```typescript
import { createValidationMiddleware, createRateLimitMiddleware } from '@/lib/validation/middleware'
import { branchCreateSchema } from '@/lib/validation/schemas'

const validateMiddleware = createValidationMiddleware(branchCreateSchema)
const rateLimitMiddleware = createRateLimitMiddleware({ maxRequests: 10, windowMs: 60000 })

export async function POST(req: NextRequest) {
  return rateLimitMiddleware(
    validateMiddleware(async (req, validatedData) => {
      // Handle validated request
      return NextResponse.json({ success: true, data: validatedData })
    })
  )(req)
}
```

## Available Schemas

### Core Data Schemas
- `profileCreateSchema` / `profileUpdateSchema` - User profile validation
- `treeCreateSchema` / `treeUpdateSchema` - Tree (family group) validation
- `branchCreateSchema` / `branchUpdateSchema` - Branch validation
- `leafCreateSchema` / `leafUpdateSchema` - Post/content validation

### Interaction Schemas
- `invitationCreateSchema` / `branchInvitationCreateSchema` - Invitation validation
- `commentCreateSchema` / `commentUpdateSchema` - Comment validation
- `reportSchema` - Content reporting validation

### Utility Schemas
- `searchSchema` - Search query validation
- `paginationSchema` - Pagination parameters
- `fileUploadSchema` - File upload validation
- `bulkDeleteSchema` - Bulk operations validation

## Security Features

### XSS Prevention
```typescript
import { sanitizeText, sanitizeUserContent } from '@/lib/validation/sanitization'

// Basic text sanitization
const cleanText = sanitizeText(userInput, { maxLength: 1000 })

// User content with HTML entity escaping
const cleanContent = sanitizeUserContent(userInput, { 
  maxLength: 5000, 
  allowNewlines: true 
})
```

### Rate Limiting
```typescript
const rateLimitMiddleware = createRateLimitMiddleware({
  maxRequests: 10,        // 10 requests
  windowMs: 60 * 1000,    // per minute
  keyGenerator: (req) => req.ip || 'anonymous'
})
```

### Input Validation
All schemas include:
- Length limits to prevent DoS attacks
- Type validation to ensure data integrity
- Format validation for emails, URLs, UUIDs
- Custom validation rules for business logic

## Error Handling

### Custom Error Types
```typescript
import { ValidationError, SecurityError } from '@/lib/validation/errors'

// Validation errors (400 status)
throw new ValidationError('Invalid email format', { field: 'email' })

// Security errors (403 status)
throw new SecurityError('Unauthorized access attempt')

// User-friendly error messages
const friendlyMessage = createUserFriendlyMessage(error)
```

### Error Aggregation
```typescript
import { ValidationErrorCollector } from '@/lib/validation/errors'

const errorCollector = new ValidationErrorCollector()
errorCollector.addError('email', 'Invalid format')
errorCollector.addError('password', 'Too short')

if (errorCollector.hasErrors()) {
  const allErrors = errorCollector.getFirstErrors()
  // { email: 'Invalid format', password: 'Too short' }
}
```

## Advanced Usage

### Real-time Field Validation
```typescript
import { useFieldValidation } from '@/hooks/useFormValidation'

function EmailField() {
  const { error, validate, isValidating } = useFieldValidation('email', profileSchema)

  return (
    <input
      onBlur={(e) => validate(e.target.value)}
      onChange={(e) => {
        if (e.target.value.includes('@')) {
          validate(e.target.value)
        }
      }}
    />
  )
}
```

### Async Validation
```typescript
import { useAsyncValidation } from '@/hooks/useFormValidation'

const { error, validate, isValidating } = useAsyncValidation(
  async (email) => {
    const response = await checkEmailAvailability(email)
    return response.available || 'Email is already taken'
  },
  500 // debounce 500ms
)
```

### Custom Middleware Composition
```typescript
import { composeMiddleware } from '@/lib/validation/middleware'

const combinedMiddleware = composeMiddleware(
  createCorsMiddleware({ origin: ['https://yourdomain.com'] }),
  createRateLimitMiddleware({ maxRequests: 5, windowMs: 60000 }),
  createValidationMiddleware(schema)
)

export const POST = combinedMiddleware(handler)
```

## Best Practices

### 1. Always Validate on Both Client and Server
```typescript
// Client-side (immediate feedback)
const clientValidation = useFormValidation({ schema })

// Server-side (security enforcement)
export const POST = createValidationMiddleware(schema)(handler)
```

### 2. Use Appropriate Sanitization
```typescript
// For display text
const displayText = sanitizeText(input, { maxLength: 200 })

// For user content (posts, comments)
const content = sanitizeUserContent(input, { 
  maxLength: 5000,
  allowNewlines: true 
})

// For search queries
const query = sanitizeSearchQuery(input)
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = validate(data)
  if (!result.success) {
    // Show user-friendly errors
    setErrors(formatValidationErrors(result.errors))
    return
  }
  // Process valid data
} catch (error) {
  // Handle unexpected errors
  const message = createUserFriendlyMessage(error)
  showErrorToast(message)
}
```

### 4. Implement Rate Limiting
```typescript
// Strict limits for write operations
const createLimiter = createRateLimitMiddleware({
  maxRequests: 5,
  windowMs: 60 * 1000
})

// Relaxed limits for read operations  
const readLimiter = createRateLimitMiddleware({
  maxRequests: 100,
  windowMs: 60 * 1000
})
```

## Security Considerations

### Data Sanitization
- All user input is sanitized before database storage
- HTML entities are escaped to prevent XSS
- File names are sanitized to prevent directory traversal
- URLs are validated to prevent malicious redirects

### Rate Limiting
- API endpoints have appropriate rate limits
- Different limits for different operations (read vs write)
- Rate limiting by user ID when available, IP otherwise

### Input Validation
- Maximum length limits on all text fields
- Type validation prevents injection attacks
- Business logic validation prevents invalid states
- File upload restrictions prevent malicious files

### Error Handling
- Sensitive information is never exposed in error messages
- Validation errors are logged for monitoring
- User-friendly messages prevent information disclosure

## Testing

### Schema Testing
```typescript
import { validateData, profileCreateSchema } from '@/lib/validation/schemas'

test('profile validation', () => {
  const validData = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com'
  }
  
  const result = validateData(profileCreateSchema, validData)
  expect(result.success).toBe(true)
})
```

### Sanitization Testing
```typescript
import { sanitizeText } from '@/lib/validation/sanitization'

test('XSS prevention', () => {
  const maliciousInput = '<script>alert("xss")</script>'
  const sanitized = sanitizeText(maliciousInput)
  expect(sanitized).not.toContain('<script>')
})
```

## Performance Considerations

- Validation schemas are cached and reused
- Rate limiting uses efficient in-memory storage
- Sanitization is optimized for common patterns
- Error handling avoids expensive stack traces in production

## Migration Guide

If upgrading from manual validation:

1. Replace manual validation with schema validation
2. Add sanitization to all user inputs  
3. Implement rate limiting on API routes
4. Update error handling to use structured errors
5. Add client-side validation for better UX

## Contributing

When adding new validation:

1. Create schemas in `schemas.ts`
2. Add sanitization if needed in `sanitization.ts`
3. Update this documentation
4. Add tests for new validation rules
5. Update API routes to use new schemas