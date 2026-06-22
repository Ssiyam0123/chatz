-- ─────────────────────────────────────────────────────────────────────────────
-- 008_perf_indexes: performance covering indexes for high-traffic queries.
-- All statements are idempotent (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- messages: covering index optimized for the DISTINCT ON conversations query.
-- The query in chat.controller.js getConversations uses:
--   WHERE sender_id = $1 OR receiver_id = $1
--   ORDER BY (sender_id == $1 ? receiver_id : sender_id), created_at DESC
-- This composite index allows Postgres to use index-scan + DISTINCT ON efficiently.
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created
  ON messages (receiver_id, sender_id, created_at DESC);

-- complementary index for the sender side of the same query
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created
  ON messages (sender_id, receiver_id, created_at DESC);

-- users: index on public_key for the new /user/:id/public-key endpoint
-- and future E2EE key lookup queries
CREATE INDEX IF NOT EXISTS idx_users_public_key
  ON users (id, public_key)
  WHERE public_key IS NOT NULL;
