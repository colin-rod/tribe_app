-- Enhance profiles table with additional fields for user profiles and settings

-- Add bio and family_role columns to profiles table
ALTER TABLE profiles 
ADD COLUMN bio TEXT,
ADD COLUMN family_role TEXT CHECK (family_role IN ('parent', 'child', 'grandparent', 'grandchild', 'sibling', 'spouse', 'partner', 'other'));

-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars bucket
-- Allow users to upload their own avatars
CREATE POLICY "Allow users to upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars' AND
  -- Avatar filename should start with 'avatar-{user_id}-'
  name ~* ('^avatar-' || auth.uid()::text || '-.*')
);

-- Allow users to view all avatars (public bucket)
CREATE POLICY "Allow public avatar viewing" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Allow users to update their own avatars" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars' AND
  name ~* ('^avatar-' || auth.uid()::text || '-.*')
);

-- Allow users to delete their own avatars
CREATE POLICY "Allow users to delete their own avatars" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars' AND
  name ~* ('^avatar-' || auth.uid()::text || '-.*')
);

-- Create user_settings table for privacy and notification preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Privacy settings
  profile_visibility TEXT DEFAULT 'circles' CHECK (profile_visibility IN ('public', 'circles', 'private')),
  show_email BOOLEAN DEFAULT false,
  show_join_date BOOLEAN DEFAULT true,
  allow_circle_discovery BOOLEAN DEFAULT true,
  
  -- Notification preferences  
  email_new_posts BOOLEAN DEFAULT true,
  email_comments BOOLEAN DEFAULT true,
  email_mentions BOOLEAN DEFAULT true,
  email_invitations BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create trigger to automatically create user_settings when a profile is created
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_settings();

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_updated_at_user_settings
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow circle members to view limited settings of other users (for privacy checks)
CREATE POLICY "Circle members can view limited settings" ON user_settings
  FOR SELECT USING (
    profile_visibility = 'public' OR
    (profile_visibility = 'circles' AND EXISTS (
      SELECT 1 FROM circle_members cm1, circle_members cm2
      WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = user_settings.user_id
      AND cm1.circle_id = cm2.circle_id
      AND cm1.status = 'active'
      AND cm2.status = 'active'
    ))
  );

-- Update profiles RLS policies to work with new privacy settings
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- New profile policies that respect privacy settings
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_settings 
      WHERE user_id = profiles.id 
      AND profile_visibility = 'public'
    )
  );

CREATE POLICY "Circle members can view each others profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_settings 
      WHERE user_id = profiles.id 
      AND profile_visibility IN ('public', 'circles')
    ) AND
    EXISTS (
      SELECT 1 FROM circle_members cm1, circle_members cm2
      WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = profiles.id
      AND cm1.circle_id = cm2.circle_id
      AND cm1.status = 'active'
      AND cm2.status = 'active'
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create index for better performance on privacy queries
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_profile_visibility ON user_settings(profile_visibility);

-- Create default user settings for existing users who don't have settings yet
INSERT INTO user_settings (user_id)
SELECT id FROM profiles 
WHERE id NOT IN (SELECT user_id FROM user_settings);