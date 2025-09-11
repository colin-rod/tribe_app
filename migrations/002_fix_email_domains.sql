-- Migration: Fix Email Domains to use colinrodrigues.com
-- This fixes the placeholder domain from the initial migration

-- Update existing email addresses to use correct domain
UPDATE tree_email_addresses 
SET email_address = REPLACE(email_address, '@yourdomain.com', '@colinrodrigues.com')
WHERE email_address LIKE '%@yourdomain.com';

-- Verify the fix worked
SELECT 
  'Email domains updated' as status,
  COUNT(*) as updated_count
FROM tree_email_addresses 
WHERE email_address LIKE '%@colinrodrigues.com';

-- Show current email addresses
SELECT 
  t.person_name,
  tea.email_address,
  t.managed_by
FROM trees t 
JOIN tree_email_addresses tea ON tea.tree_id = t.id
WHERE tea.is_active = true
ORDER BY t.person_name;