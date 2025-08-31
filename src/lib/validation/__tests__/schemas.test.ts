import { 
  emailSchema, 
  uuidSchema, 
  sanitizedTextSchema, 
  profileCreateSchema,
  profileUpdateSchema,
  treeCreateSchema,
  branchCreateSchema 
} from '../schemas'

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('validates correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first.last+tag@domain.org'
      ]

      validEmails.forEach(email => {
        expect(emailSchema.safeParse(email).success).toBe(true)
      })
    })

    it('rejects invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user space@domain.com'
      ]

      invalidEmails.forEach(email => {
        expect(emailSchema.safeParse(email).success).toBe(false)
      })
    })
  })

  describe('uuidSchema', () => {
    it('validates correct UUID format', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ]

      validUuids.forEach(uuid => {
        expect(uuidSchema.safeParse(uuid).success).toBe(true)
      })
    })

    it('rejects invalid UUID format', () => {
      const invalidUuids = [
        'not-a-uuid',
        '123-456-789',
        '123e4567-e89b-12d3-a456-42661417400' // too short
      ]

      invalidUuids.forEach(uuid => {
        expect(uuidSchema.safeParse(uuid).success).toBe(false)
      })
    })
  })

  describe('sanitizedTextSchema', () => {
    it('validates clean text within length limits', () => {
      const schema = sanitizedTextSchema(1, 50)
      
      expect(schema.safeParse('Valid text').success).toBe(true)
      expect(schema.safeParse('Text with numbers 123').success).toBe(true)
      expect(schema.safeParse('Text with émojis 🌳').success).toBe(true)
    })

    it('rejects text with HTML tags', () => {
      const schema = sanitizedTextSchema(1, 50)
      
      const htmlStrings = [
        '<script>alert("xss")</script>',
        'Text with <strong>bold</strong>',
        '<div>Content</div>',
        'Text with <a href="#">link</a>'
      ]

      htmlStrings.forEach(html => {
        expect(schema.safeParse(html).success).toBe(false)
      })
    })

    it('enforces minimum length', () => {
      const schema = sanitizedTextSchema(5, 50)
      
      expect(schema.safeParse('Hi').success).toBe(false)
      expect(schema.safeParse('Hello').success).toBe(true)
    })

    it('enforces maximum length', () => {
      const schema = sanitizedTextSchema(1, 10)
      
      expect(schema.safeParse('Short').success).toBe(true)
      expect(schema.safeParse('This is too long').success).toBe(false)
    })

    it('trims whitespace', () => {
      const schema = sanitizedTextSchema(1, 50)
      
      const result = schema.parse('  padded text  ')
      expect(result).toBe('padded text')
    })
  })

  describe('profileCreateSchema', () => {
    it('validates complete profile data', () => {
      const validProfile = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        avatar_url: 'https://example.com/avatar.jpg',
        profile_visibility: 'branches' as const,
        timezone: 'America/New_York',
        language: 'en',
        date_format: 'MM/DD/YYYY' as const,
      }

      expect(profileCreateSchema.safeParse(validProfile).success).toBe(true)
    })

    it('validates minimal profile data', () => {
      const minimalProfile = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
      }

      expect(profileCreateSchema.safeParse(minimalProfile).success).toBe(true)
    })

    it('rejects profile with invalid email', () => {
      const invalidProfile = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
      }

      expect(profileCreateSchema.safeParse(invalidProfile).success).toBe(false)
    })

    it('rejects profile with HTML in name fields', () => {
      const profileWithHtml = {
        first_name: '<script>John</script>',
        last_name: 'Doe',
        email: 'john.doe@example.com',
      }

      expect(profileCreateSchema.safeParse(profileWithHtml).success).toBe(false)
    })
  })

  describe('profileUpdateSchema', () => {
    it('allows partial updates', () => {
      const partialUpdate = {
        first_name: 'Jane',
      }

      expect(profileUpdateSchema.safeParse(partialUpdate).success).toBe(true)
    })

    it('validates updated email if provided', () => {
      const updateWithValidEmail = {
        email: 'new.email@example.com',
      }

      const updateWithInvalidEmail = {
        email: 'invalid-email',
      }

      expect(profileUpdateSchema.safeParse(updateWithValidEmail).success).toBe(true)
      expect(profileUpdateSchema.safeParse(updateWithInvalidEmail).success).toBe(false)
    })
  })

  describe('treeCreateSchema', () => {
    it('validates tree creation data', () => {
      const validTree = {
        name: 'Family Tree',
        description: 'Our family memories',
        privacy: 'private' as const,
        settings: { theme: 'light' },
      }

      expect(treeCreateSchema.safeParse(validTree).success).toBe(true)
    })

    it('requires name field', () => {
      const treeWithoutName = {
        description: 'Tree without name',
      }

      expect(treeCreateSchema.safeParse(treeWithoutName).success).toBe(false)
    })

    it('rejects HTML in tree name', () => {
      const treeWithHtml = {
        name: '<script>alert("xss")</script>',
        description: 'Valid description',
      }

      expect(treeCreateSchema.safeParse(treeWithHtml).success).toBe(false)
    })
  })

  describe('branchCreateSchema', () => {
    it('validates branch creation data', () => {
      const validBranch = {
        name: 'Kids Branch',
        description: 'For the children',
        tree_id: '123e4567-e89b-12d3-a456-426614174000',
      }

      expect(branchCreateSchema.safeParse(validBranch).success).toBe(true)
    })

    it('requires valid tree_id UUID', () => {
      const branchWithInvalidTreeId = {
        name: 'Kids Branch',
        description: 'For the children',
        tree_id: 'invalid-id',
      }

      expect(branchCreateSchema.safeParse(branchWithInvalidTreeId).success).toBe(false)
    })
  })
})