-- ─────────────────────────────────────────────────────────────────────────────
-- 002_indexes: add missing indexes and uniqueness constraints.
-- All statements are idempotent (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- messages: composite covering index for chat-history queries that filter by
-- (sender_id, receiver_id) and order by created_at DESC. The two separate
-- single-column indexes created in the baseline remain (cheap, harmless).
CREATE INDEX IF NOT EXISTS idx_messages_pair_created
  ON messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);

-- friend_requests: one pending request per ordered (sender, receiver) pair.
-- Partial index so accepted/declined history doesn't block re-requesting.
CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_requests_pending_pair
  ON friend_requests (sender_id, receiver_id)
  WHERE status = 'pending';

-- user_friends: reverse lookup (find rows where a user is the friend).
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id
  ON user_friends (friend_id);

-- group_messages: per-group chronological scan already covered by baseline
-- idx_group_messages_group_created; no change needed.

-- posts: feed scan by created_at already indexed; add user+created_at for
-- profile feeds (user posts ordered by recency).
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON posts (user_id, created_at DESC);
