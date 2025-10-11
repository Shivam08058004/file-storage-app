-- Add Email Verification Columns to Existing Users Table
-- Run this SQL in your Supabase SQL Editor

-- Add verification token columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Optional: Mark existing OAuth users as verified
UPDATE users 
SET email_verified = true 
WHERE provider = 'google' AND email_verified = false;

-- Check the updated schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
