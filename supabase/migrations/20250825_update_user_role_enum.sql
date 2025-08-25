-- Update user_role enum to include new RBAC roles

-- Add the new roles to the existing enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- Note: PostgreSQL doesn't allow reordering enum values easily
-- The order will be: admin, member, viewer, owner, moderator
-- This is fine for functionality, just not alphabetical