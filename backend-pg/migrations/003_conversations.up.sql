-- ─────────────────────────────────────────────────────────────────────────────
-- 003_conversations: denormalized conversation registry.
--
-- Replaces the expensive DISTINCT ON window scan in getConversations with a
-- single ordered scan. A conversation row is created lazily on first message
-- (direct or group) and updated in the same transaction as each new message.
--
-- For direct conversations we store the unordered participant pair
-- (participant_lo, participant_hi) so a message's (sender, receiver) maps to
-- exactly one conversation via LEAST/GREATEST — no circular membership bootstrap.
-- Backfill happens in 004_backfill_last_message.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('direct', 'group');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS conversations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                      conversation_type NOT NULL,
  group_id                  UUID,            -- set only for type='group'
  participant_lo            UUID,            -- LEAST(a,b) of the two members; direct only
  participant_hi            UUID,            -- GREATEST(a,b) of the two members; direct only
  last_message_at           TIMESTAMPTZ,
  last_message_preview      TEXT,
  last_message_is_encrypted BOOLEAN NOT NULL DEFAULT false,
  last_message_image        BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One direct conversation per unordered participant pair.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_direct_pair
  ON conversations (participant_lo, participant_hi)
  WHERE type = 'direct';

-- One group conversation per group.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_group
  ON conversations (group_id)
  WHERE type = 'group';

-- Feed: newest conversations first.
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS conversation_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL,
  user_id          UUID NOT NULL,
  unread_count     INTEGER NOT NULL DEFAULT 0,
  last_read_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_conversation_members_pair UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members (user_id);

-- Unread badge lookups: members with unread, per user.
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_unread
  ON conversation_members (user_id) WHERE unread_count > 0;

DO $$ BEGIN
  ALTER TABLE conversation_members
    DROP CONSTRAINT IF EXISTS fk_conversation_members__conversation_id,
    DROP CONSTRAINT IF EXISTS fk_conversation_members__user_id,
    ADD  CONSTRAINT fk_conversation_members__conversation_id
         FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_conversation_members__user_id
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS fk_conversations__group_id,
    ADD  CONSTRAINT fk_conversations__group_id
         FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
END $$;
