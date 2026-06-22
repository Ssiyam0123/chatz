-- Revert 008_perf_indexes
DROP INDEX IF EXISTS idx_messages_receiver_sender_created;
DROP INDEX IF EXISTS idx_messages_sender_receiver_created;
DROP INDEX IF EXISTS idx_users_public_key;
