-- Drop all foreign-key constraints added by 001_fk_cascades.
-- Data is preserved; only the constraints are removed.

ALTER TABLE story_viewers
  DROP CONSTRAINT IF EXISTS fk_story_viewers__story_id,
  DROP CONSTRAINT IF EXISTS fk_story_viewers__user_id;

ALTER TABLE stories
  DROP CONSTRAINT IF EXISTS fk_stories__user_id;

ALTER TABLE post_shares
  DROP CONSTRAINT IF EXISTS fk_post_shares__post_id,
  DROP CONSTRAINT IF EXISTS fk_post_shares__user_id;

ALTER TABLE post_comment_reactions
  DROP CONSTRAINT IF EXISTS fk_post_comment_reactions__comment_id,
  DROP CONSTRAINT IF EXISTS fk_post_comment_reactions__user_id;

ALTER TABLE post_comments
  DROP CONSTRAINT IF EXISTS fk_post_comments__post_id,
  DROP CONSTRAINT IF EXISTS fk_post_comments__user_id;

ALTER TABLE post_reactions
  DROP CONSTRAINT IF EXISTS fk_post_reactions__post_id,
  DROP CONSTRAINT IF EXISTS fk_post_reactions__user_id;

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS fk_posts__user_id,
  DROP CONSTRAINT IF EXISTS fk_posts__original_post_id;

ALTER TABLE friend_requests
  DROP CONSTRAINT IF EXISTS fk_friend_requests__sender_id,
  DROP CONSTRAINT IF EXISTS fk_friend_requests__receiver_id;

ALTER TABLE group_messages
  DROP CONSTRAINT IF EXISTS fk_group_messages__group_id,
  DROP CONSTRAINT IF EXISTS fk_group_messages__sender_id;

ALTER TABLE group_members
  DROP CONSTRAINT IF EXISTS fk_group_members__group_id,
  DROP CONSTRAINT IF EXISTS fk_group_members__user_id;

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS fk_groups__creator_id;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS fk_messages__sender_id,
  DROP CONSTRAINT IF EXISTS fk_messages__receiver_id;

ALTER TABLE user_friends
  DROP CONSTRAINT IF EXISTS fk_user_friends__user_id,
  DROP CONSTRAINT IF EXISTS fk_user_friends__friend_id;
