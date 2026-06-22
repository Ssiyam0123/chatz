-- Add missing admin role properties to the users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS banned_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warnings         JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create partial indexes for fast lookups on banned/suspended status
CREATE INDEX IF NOT EXISTS idx_users_banned    ON users (banned_at) WHERE banned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users (suspended_at) WHERE suspended_at IS NOT NULL;
