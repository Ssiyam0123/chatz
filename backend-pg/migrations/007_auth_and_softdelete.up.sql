-- ─────────────────────────────────────────────────────────────────────────────
-- 007_auth_and_softdelete: auth bookkeeping + soft delete for posts/messages.
--
--   users.email_verified       BOOLEAN DEFAULT false
--   users.password_changed_at  TIMESTAMPTZ DEFAULT now()   (token-version check)
--
--   posts   .deleted_at  (paranoid)
--   messages.deleted_at (paranoid)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── users ───────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users (email_verified) WHERE email_verified = false;

-- ─── posts (soft delete) ─────────────────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts (deleted_at);

-- Exclude soft-deleted rows from the existing feed indexes so the planner can
-- use a partial index for live feeds.
CREATE INDEX IF NOT EXISTS idx_posts_created_at_live
  ON posts (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_user_created_live
  ON posts (user_id, created_at DESC) WHERE deleted_at IS NULL;

-- ─── messages (soft delete) ──────────────────────────────────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages (deleted_at);
