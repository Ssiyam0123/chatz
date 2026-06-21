-- ─────────────────────────────────────────────────────────────────────────────
-- 005_message_read: authoritative per-recipient message delivery/read state.
--
-- The mobile app previously tracked unread counts only in client memory, which
-- reset on every restart. This table makes the server the source of truth so
-- unread counts survive restarts and stay consistent across devices.
--
-- Only one row per (message_id, user_id): for DMs the recipient is tracked;
-- for group messages every non-sender member gets a row on send.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS message_status (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id     UUID NOT NULL,
  user_id        UUID NOT NULL,            -- the recipient
  delivered_at   TIMESTAMPTZ,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_status_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_status_user_unread
  ON message_status (user_id, read_at)
  WHERE read_at IS NULL;

-- FKs to messages and users. message_status is cleaned up automatically when a
-- message or user is deleted. (group_message_status below is a separate table
-- because group_messages has a different PK shape; we union in the read path.)
DO $$ BEGIN
  ALTER TABLE message_status
    DROP CONSTRAINT IF EXISTS fk_message_status__message_id,
    DROP CONSTRAINT IF EXISTS fk_message_status__user_id,
    ADD  CONSTRAINT fk_message_status__message_id
         FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_message_status__user_id
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Equivalent delivery/read tracking for group messages.
CREATE TABLE IF NOT EXISTS group_message_status (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id     UUID NOT NULL,
  group_id       UUID NOT NULL,
  user_id        UUID NOT NULL,            -- the recipient (group member)
  delivered_at   TIMESTAMPTZ,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_group_message_status_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_message_status_user_unread
  ON group_message_status (user_id, read_at)
  WHERE read_at IS NULL;

DO $$ BEGIN
  ALTER TABLE group_message_status
    DROP CONSTRAINT IF EXISTS fk_group_message_status__message_id,
    DROP CONSTRAINT IF EXISTS fk_group_message_status__group_id,
    DROP CONSTRAINT IF EXISTS fk_group_message_status__user_id,
    ADD  CONSTRAINT fk_group_message_status__message_id
         FOREIGN KEY (message_id) REFERENCES group_messages(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_group_message_status__group_id
         FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_group_message_status__user_id
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;
