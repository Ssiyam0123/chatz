import pool from '../config/pgDatabase.js';

const pruneDb = async () => {
  console.log('🧹 Starting Direct Truncation to free up space...');
  try {
    await pool.query(`
      TRUNCATE TABLE 
        posts, 
        post_reactions, 
        post_comments, 
        post_comment_reactions, 
        post_shares, 
        stories, 
        story_viewers, 
        messages, 
        message_status, 
        group_messages, 
        group_message_status, 
        conversations, 
        conversation_members
      CASCADE;
    `);
    console.log('🎉 Database tables truncated successfully! Space is 100% freed.');
  } catch (err) {
    console.error('❌ Truncation failed:', err);
  } finally {
    process.exit(0);
  }
};

pruneDb();
