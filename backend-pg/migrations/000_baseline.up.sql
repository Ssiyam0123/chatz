-- ─────────────────────────────────────────────────────────────────────────────
-- Baseline migration: recreates the schema exactly as it exists today.
--
-- SAFE-BOOTSTRAP NOTE:
-- The runner detects an already-populated database (the `users` table exists)
-- and marks this migration as applied WITHOUT running it, so existing data is
-- never touched. On a fresh database this SQL creates everything from scratch.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extension for UUID generation (gen_random_uuid via pgcrypto as a fallback).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  avatar        VARCHAR(500) NOT NULL DEFAULT '',
  bio           TEXT NOT NULL DEFAULT '',
  public_key    TEXT,
  cover_photo   VARCHAR(500) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── user_friends ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  friend_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_friends_user_friend UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends (friend_id);

-- ─── messages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL,
  receiver_id   UUID NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  image         VARCHAR(500),
  ciphertext    TEXT,
  nonce         VARCHAR(500),
  is_encrypted  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages (sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

-- ─── groups ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  creator_id   UUID NOT NULL,
  avatar       VARCHAR(500) NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── group_members ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL,
  user_id     UUID NOT NULL,
  CONSTRAINT uq_group_members_group_user UNIQUE (group_id, user_id)
);

-- ─── group_messages ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL,
  sender_id    UUID NOT NULL,
  text         TEXT NOT NULL DEFAULT '',
  image        VARCHAR(500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON group_messages (group_id, created_at);

-- ─── friend_requests ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS friend_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL,
  receiver_id  UUID NOT NULL,
  status       friend_request_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_receiver ON friend_requests (sender_id, receiver_id);

-- ─── posts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  content           TEXT NOT NULL DEFAULT '',
  image             VARCHAR(500) NOT NULL DEFAULT '',
  images            JSONB NOT NULL DEFAULT '[]',
  original_post_id  UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at);

-- ─── post_reactions ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE post_reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS post_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL,
  user_id     UUID NOT NULL,
  type        post_reaction_type NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_reactions_post_user UNIQUE (post_id, user_id)
);

-- ─── post_comments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL,
  user_id     UUID NOT NULL,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created ON post_comments (post_id, created_at);

-- ─── post_comment_reactions ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE post_comment_reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS post_comment_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  type        post_comment_reaction_type NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_comment_reactions_comment_user UNIQUE (comment_id, user_id)
);

-- ─── post_shares ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL,
  user_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_shares_post_user UNIQUE (post_id, user_id)
);

-- ─── stories ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  image       VARCHAR(500) NOT NULL,
  text        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories (user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories (created_at);

-- ─── story_viewers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_viewers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    UUID NOT NULL,
  user_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_story_viewers_story_user UNIQUE (story_id, user_id)
);
