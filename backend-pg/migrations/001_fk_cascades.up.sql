-- ─────────────────────────────────────────────────────────────────────────────
-- 001_fk_cascades: add foreign-key constraints with ON DELETE CASCADE.
--
-- Before adding each FK we delete any orphaned child rows so the constraint
-- can be created on a live database. Each table section is wrapped in a
-- DO block that drops a pre-existing constraint (if any) before re-adding it,
-- making the migration idempotent.
--
-- Naming convention: fk_<table>__<column>
-- ─────────────────────────────────────────────────────────────────────────────

-- ╭─ user_friends ───────────────────────────────────────────────────────────╮
DELETE FROM user_friends
 WHERE user_id   NOT IN (SELECT id FROM users)
    OR friend_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE user_friends
    DROP CONSTRAINT IF EXISTS fk_user_friends__user_id,
    DROP CONSTRAINT IF EXISTS fk_user_friends__friend_id,
    ADD  CONSTRAINT fk_user_friends__user_id   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_user_friends__friend_id FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ messages ───────────────────────────────────────────────────────────────╮
DELETE FROM messages
 WHERE sender_id   NOT IN (SELECT id FROM users)
    OR receiver_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS fk_messages__sender_id,
    DROP CONSTRAINT IF EXISTS fk_messages__receiver_id,
    ADD  CONSTRAINT fk_messages__sender_id   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_messages__receiver_id FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ groups ─────────────────────────────────────────────────────────────────╮
DELETE FROM groups WHERE creator_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE groups
    DROP CONSTRAINT IF EXISTS fk_groups__creator_id,
    ADD  CONSTRAINT fk_groups__creator_id FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ group_members ──────────────────────────────────────────────────────────╮
DELETE FROM group_members
 WHERE group_id NOT IN (SELECT id FROM groups)
    OR user_id  NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE group_members
    DROP CONSTRAINT IF EXISTS fk_group_members__group_id,
    DROP CONSTRAINT IF EXISTS fk_group_members__user_id,
    ADD  CONSTRAINT fk_group_members__group_id FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_group_members__user_id  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE;
END $$;

-- ╭─ group_messages ─────────────────────────────────────────────────────────╮
DELETE FROM group_messages
 WHERE group_id NOT IN (SELECT id FROM groups)
    OR sender_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE group_messages
    DROP CONSTRAINT IF EXISTS fk_group_messages__group_id,
    DROP CONSTRAINT IF EXISTS fk_group_messages__sender_id,
    ADD  CONSTRAINT fk_group_messages__group_id  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_group_messages__sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ friend_requests ────────────────────────────────────────────────────────╮
DELETE FROM friend_requests
 WHERE sender_id   NOT IN (SELECT id FROM users)
    OR receiver_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE friend_requests
    DROP CONSTRAINT IF EXISTS fk_friend_requests__sender_id,
    DROP CONSTRAINT IF EXISTS fk_friend_requests__receiver_id,
    ADD  CONSTRAINT fk_friend_requests__sender_id   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_friend_requests__receiver_id FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ posts ──────────────────────────────────────────────────────────────────╮
DELETE FROM posts
 WHERE user_id          NOT IN (SELECT id FROM users)
    OR (original_post_id IS NOT NULL AND original_post_id NOT IN (SELECT id FROM posts));

DO $$ BEGIN
  ALTER TABLE posts
    DROP CONSTRAINT IF EXISTS fk_posts__user_id,
    DROP CONSTRAINT IF EXISTS fk_posts__original_post_id,
    ADD  CONSTRAINT fk_posts__user_id           FOREIGN KEY (user_id)          REFERENCES users(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_posts__original_post_id  FOREIGN KEY (original_post_id) REFERENCES posts(id) ON DELETE CASCADE;
END $$;

-- ╭─ post_reactions ─────────────────────────────────────────────────────────╮
DELETE FROM post_reactions
 WHERE post_id NOT IN (SELECT id FROM posts)
    OR user_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE post_reactions
    DROP CONSTRAINT IF EXISTS fk_post_reactions__post_id,
    DROP CONSTRAINT IF EXISTS fk_post_reactions__user_id,
    ADD  CONSTRAINT fk_post_reactions__post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_post_reactions__user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ post_comments ──────────────────────────────────────────────────────────╮
DELETE FROM post_comments
 WHERE post_id NOT IN (SELECT id FROM posts)
    OR user_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE post_comments
    DROP CONSTRAINT IF EXISTS fk_post_comments__post_id,
    DROP CONSTRAINT IF EXISTS fk_post_comments__user_id,
    ADD  CONSTRAINT fk_post_comments__post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_post_comments__user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ post_comment_reactions ─────────────────────────────────────────────────╮
DELETE FROM post_comment_reactions
 WHERE comment_id NOT IN (SELECT id FROM post_comments)
    OR user_id     NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE post_comment_reactions
    DROP CONSTRAINT IF EXISTS fk_post_comment_reactions__comment_id,
    DROP CONSTRAINT IF EXISTS fk_post_comment_reactions__user_id,
    ADD  CONSTRAINT fk_post_comment_reactions__comment_id FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_post_comment_reactions__user_id   FOREIGN KEY (user_id)     REFERENCES users(id)        ON DELETE CASCADE;
END $$;

-- ╭─ post_shares ────────────────────────────────────────────────────────────╮
DELETE FROM post_shares
 WHERE post_id NOT IN (SELECT id FROM posts)
    OR user_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE post_shares
    DROP CONSTRAINT IF EXISTS fk_post_shares__post_id,
    DROP CONSTRAINT IF EXISTS fk_post_shares__user_id,
    ADD  CONSTRAINT fk_post_shares__post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_post_shares__user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ stories ────────────────────────────────────────────────────────────────╮
DELETE FROM stories WHERE user_id NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE stories
    DROP CONSTRAINT IF EXISTS fk_stories__user_id,
    ADD  CONSTRAINT fk_stories__user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- ╭─ story_viewers ──────────────────────────────────────────────────────────╮
DELETE FROM story_viewers
 WHERE story_id NOT IN (SELECT id FROM stories)
    OR user_id  NOT IN (SELECT id FROM users);

DO $$ BEGIN
  ALTER TABLE story_viewers
    DROP CONSTRAINT IF EXISTS fk_story_viewers__story_id,
    DROP CONSTRAINT IF EXISTS fk_story_viewers__user_id,
    ADD  CONSTRAINT fk_story_viewers__story_id FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    ADD  CONSTRAINT fk_story_viewers__user_id  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE;
END $$;
