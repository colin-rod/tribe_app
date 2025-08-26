-- Simple profile enhancement migration
-- Add missing fields to profiles table

-- Add bio and family_role columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS family_role text CHECK (family_role IN ('parent', 'child', 'grandparent', 'grandchild', 'sibling', 'spouse', 'partner', 'other'));

-- Create the missing update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public avatar viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Allow users to upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars' AND
  name ~* ('^avatar-' || auth.uid()::text || '-.*')
);

CREATE POLICY "Allow public avatar viewing" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow users to update their own avatars" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars' AND
  name ~* ('^avatar-' || auth.uid()::text || '-.*')
);

CREATE POLICY "Allow users to delete their own avatars" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars' AND
  name ~* ('^avatar-' || auth.uid()::text || '-.*')
);