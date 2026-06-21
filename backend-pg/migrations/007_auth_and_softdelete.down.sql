-- Reverse of 007_auth_and_softdelete.

DROP INDEX IF EXISTS idx_messages_deleted_at;
ALTER TABLE messages DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_posts_user_created_live;
DROP INDEX IF EXISTS idx_posts_created_at_live;
DROP INDEX IF EXISTS idx_posts_deleted_at;
ALTER TABLE posts DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_users_email_verified;
ALTER TABLE users
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS email_verified;
