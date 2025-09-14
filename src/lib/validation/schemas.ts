import { z } from 'zod'

// Common validation patterns
export const emailSchema = z.string().email('Please enter a valid email address')
export const uuidSchema = z.string().uuid('Invalid ID format')
export const urlSchema = z.string().url('Please enter a valid URL').optional()
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number').optional()

// Text content validation with XSS prevention
export const sanitizedTextSchema = (minLength = 0, maxLength = 1000) =>
  z.string()
    .trim()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be ${maxLength} characters or less`)
    .refine((val) => {
      // Basic XSS prevention - reject HTML tags
      const hasHtmlTags = /<[^>]*>/g.test(val)
      return !hasHtmlTags
    }, 'HTML tags are not allowed')

// Profile validation schemas
export const profileCreateSchema = z.object({
  first_name: sanitizedTextSchema(1, 50),
  last_name: sanitizedTextSchema(1, 50),
  email: emailSchema,
  phone: phoneSchema,
  avatar_url: urlSchema,
  profile_visibility: z.enum(['public', 'branches', 'private']).default('branches'),
  timezone: z.string().optional(),
  language: z.string().max(10).optional(),
  date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
})

export const profileUpdateSchema = profileCreateSchema.partial()

// Tree validation schemas
export const treeCreateSchema = z.object({
  name: sanitizedTextSchema(1, 100),
  description: sanitizedTextSchema(0, 500),
  privacy: z.enum(['private', 'family_only']).default('private'),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const treeUpdateSchema = treeCreateSchema.partial()

// Branch validation schemas  
export const branchCreateSchema = z.object({
  name: sanitizedTextSchema(1, 100),
  description: sanitizedTextSchema(0, 500),
  tree_id: uuidSchema,
  type: z.enum(['general', 'milestone', 'photo', 'journal', 'event']).default('general'),
  privacy: z.enum(['private', 'tree_members', 'cross_tree']).default('private'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code').optional(),
  category: sanitizedTextSchema(0, 50),
  auto_approve_members: z.boolean().default(true),
  is_discoverable: z.boolean().default(false),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const branchUpdateSchema = branchCreateSchema.partial()

// Leaf (post) validation schemas
export const leafCreateSchema = z.object({
  content: sanitizedTextSchema(0, 5000),
  branch_id: uuidSchema,
  milestone_type: z.enum([
    'first_steps', 'first_words', 'birthday', 'graduation', 
    'achievement', 'holiday', 'vacation', 'family_event', 'other'
  ]).optional(),
  scheduled_for: z.string().datetime().optional(),
  media_urls: z.array(urlSchema).max(10, 'Maximum 10 media files allowed').optional(),
  tags: z.array(sanitizedTextSchema(1, 30)).max(20, 'Maximum 20 tags allowed').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const leafUpdateSchema = leafCreateSchema.partial()

// Invitation validation schemas
export const invitationCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'moderator', 'member', 'viewer']),
  tree_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  message: sanitizedTextSchema(0, 500),
  expires_at: z.string().datetime().optional(),
})

export const branchInvitationCreateSchema = z.object({
  email: emailSchema,
  branch_id: uuidSchema,
  role: z.enum(['admin', 'moderator', 'member', 'viewer']),
  message: sanitizedTextSchema(0, 500),
})

// Member management schemas
export const memberRoleUpdateSchema = z.object({
  user_id: uuidSchema,
  role: z.enum(['owner', 'admin', 'moderator', 'member', 'viewer']),
  context_type: z.enum(['tree', 'branch']),
  context_id: uuidSchema,
})

// Comment validation schemas
export const commentCreateSchema = z.object({
  content: sanitizedTextSchema(1, 2000),
  leaf_id: uuidSchema,
  parent_id: uuidSchema.optional(), // For nested comments
})

export const commentUpdateSchema = z.object({
  content: sanitizedTextSchema(1, 2000),
})

// Search and filter schemas
export const searchSchema = z.object({
  query: sanitizedTextSchema(0, 200),
  tree_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  author_id: uuidSchema.optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  milestone_type: z.string().optional(),
  tags: z.array(sanitizedTextSchema(1, 30)).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// Settings schemas
export const userSettingsUpdateSchema = z.object({
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  privacy_level: z.enum(['public', 'branches', 'private']).default('branches'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  timezone: z.string().optional(),
  language: z.string().max(10).optional(),
})

export const branchSettingsUpdateSchema = z.object({
  auto_approve_members: z.boolean(),
  allow_cross_tree_posts: z.boolean(),
  moderation_level: z.enum(['none', 'light', 'strict']).default('light'),
  post_approval_required: z.boolean().default(false),
  allow_anonymous_posts: z.boolean().default(false),
})

// File upload validation
export const fileUploadSchema = z.object({
  file_name: sanitizedTextSchema(1, 255),
  file_size: z.number().max(10 * 1024 * 1024, 'File must be smaller than 10MB'), // 10MB limit
  file_type: z.enum([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf'
  ]),
  alt_text: sanitizedTextSchema(0, 200),
})

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

// Cross-tree access schemas
export const crossTreeAccessSchema = z.object({
  branch_id: uuidSchema,
  tree_id: uuidSchema,
  permissions: z.object({
    can_read: z.boolean().default(true),
    can_comment: z.boolean().default(false),
    can_like: z.boolean().default(true),
  }),
})

// Report/moderation schemas
export const reportSchema = z.object({
  reported_content_type: z.enum(['leaf', 'comment', 'user']),
  reported_content_id: uuidSchema,
  reason: z.enum([
    'spam', 'inappropriate_content', 'harassment', 
    'false_information', 'copyright_violation', 'other'
  ]),
  description: sanitizedTextSchema(0, 1000),
})

// Bulk operation schemas
export const bulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100, 'Cannot delete more than 100 items at once'),
  confirm: z.literal(true).refine(val => val === true, {
    message: 'Please confirm the bulk delete operation'
  }),
})

// Rate limiting validation
export const rateLimitSchema = z.object({
  action: z.string(),
  identifier: z.string(),
  limit: z.number().min(1),
  window: z.number().min(1000), // milliseconds
})

// Export validation helper functions
export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: string[]
}

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => `${err.path.join('.')}: ${err.message}`),
      }
    }
    return {
      success: false,
      errors: ['Validation failed with unknown error'],
    }
  }
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = validateData(schema, data)
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`)
    }
    return result.data!
  }
}