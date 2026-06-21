-- Drop indexes/constraints added by 002_indexes.

DROP INDEX IF EXISTS idx_posts_user_created;
DROP INDEX IF EXISTS idx_user_friends_friend_id;
DROP INDEX IF EXISTS uq_friend_requests_pending_pair;
DROP INDEX IF EXISTS idx_messages_pair_created;
