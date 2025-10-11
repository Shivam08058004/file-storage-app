-- File Storage App Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT false,
  password_hash TEXT, -- null for OAuth users
  provider TEXT DEFAULT 'email', -- 'google', 'email', etc.
  verification_token TEXT, -- token for email verification
  verification_token_expires TIMESTAMPTZ, -- expiration time for verification token
  storage_used BIGINT DEFAULT 0, -- bytes
  storage_limit BIGINT DEFAULT 10737418240, -- 10GB in bytes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  s3_key TEXT NOT NULL, -- full S3 path: userId/folder/timestamp-filename
  s3_url TEXT NOT NULL, -- full S3 URL for access
  parent_folder TEXT, -- folder path (null for root)
  is_folder BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_share_token ON files(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_files_parent_folder ON files(user_id, parent_folder);
CREATE INDEX idx_users_email ON users(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for files table
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- Public access policy for shared files
CREATE POLICY "Anyone can view shared files"
  ON files FOR SELECT
  USING (share_token IS NOT NULL);

-- Function to update user storage usage
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- Decrease storage when file is deleted
    UPDATE users
    SET storage_used = GREATEST(0, storage_used - OLD.size)
    WHERE id = OLD.user_id;
    RETURN OLD;
  ELSIF (TG_OP = 'INSERT') THEN
    -- Increase storage when file is added
    UPDATE users
    SET storage_used = storage_used + NEW.size
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE' AND OLD.size != NEW.size) THEN
    -- Update storage when file size changes
    UPDATE users
    SET storage_used = GREATEST(0, storage_used - OLD.size + NEW.size)
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user storage
CREATE TRIGGER update_user_storage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage();

-- Insert a test user (optional - remove in production)
-- Password: 'password123' (hashed with bcrypt)
INSERT INTO users (email, name, email_verified, password_hash, provider)
VALUES (
  'test@example.com',
  'Test User',
  true,
  '$2a$10$rYvLhJXqLfLvJQJ5RJGqyeXxHXxYZvJCXqVqJCxqVqJCxqVqJCxqV', -- placeholder hash
  'email'
);

-- Success message
SELECT 'Database schema created successfully!' AS message;
