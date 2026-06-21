-- Reverse of 000_baseline: drops every table created by the baseline.
-- DANGEROUS — only run against a throwaway database.

DROP TABLE IF EXISTS story_viewers;
DROP TABLE IF EXISTS stories;
DROP TABLE IF EXISTS post_shares;
DROP TABLE IF EXISTS post_comment_reactions;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_reactions;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS group_messages;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS user_friends;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS post_comment_reaction_type;
DROP TYPE IF EXISTS post_reaction_type;
DROP TYPE IF EXISTS friend_request_status;
