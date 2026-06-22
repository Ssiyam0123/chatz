-- Remove indexes
DROP INDEX IF EXISTS idx_users_suspended;
DROP INDEX IF EXISTS idx_users_banned;

-- Remove columns
ALTER TABLE users
  DROP COLUMN IF EXISTS warnings,
  DROP COLUMN IF EXISTS suspended_until,
  DROP COLUMN IF EXISTS suspended_at,
  DROP COLUMN IF EXISTS banned_at;
