-- Reverse of 004: clear the conversation rows and members (does not touch
-- the underlying messages / group_messages, which remain the source of truth).
TRUNCATE conversation_members;
TRUNCATE conversations RESTART IDENTITY CASCADE;
