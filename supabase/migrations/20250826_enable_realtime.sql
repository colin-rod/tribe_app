-- Enable real-time for posts, comments, and likes tables
-- This allows Supabase to send real-time notifications when data changes

-- Enable real-time on posts table
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- Enable real-time on comments table  
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Enable real-time on likes table
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- Optional: Enable real-time on circle_members for member changes
ALTER PUBLICATION supabase_realtime ADD TABLE circle_members;