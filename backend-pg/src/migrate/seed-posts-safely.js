import pool from '../config/pgDatabase.js';

const MOCK_POSTS = [
  { content: 'Just had an amazing cup of coffee! starting the day right. ☕✨', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500' },
  { content: 'Deep dive into advanced database design today. PostgreSQL is awesome! 📊💻', image: '' },
  { content: 'Working on a new Next.js project. The developer experience is next level. 🚀', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500' },
  { content: 'Beautiful sunset this evening! Mother Nature never fails to amaze. 🌅❤️', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500' },
  { content: 'Just finished reading a great book on system design. Highly recommend it to everyone! 📖', image: '' },
  { content: 'Sunday brunch done right. Pancakes, maple syrup, and good vibes. 🥞🍓', image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=500' },
  { content: 'Does anyone have recommendations for good React Native UI component libraries?', image: '' },
  { content: 'Had a great weekend hiking in the mountains. Fresh air and beautiful views! ⛰️🌲', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500' },
  { content: 'Spent the afternoon cleaning up my workspace. Clean desk, clean mind! 🖥️🧹', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
  { content: 'Exciting things are coming soon! Stay tuned. 😉✨', image: '' }
];

const MOCK_COMMENTS = [
  'Wow, this looks amazing! 😍',
  'Totally agree with you on this one.',
  'Could you share the link or resource?',
  'Nice! Keep it up.',
  'This is super helpful, thanks for sharing!',
  'Interesting thoughts, would love to discuss more.',
  'Hahaha same here!',
  'Awesome share!'
];

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

const seedPosts = async () => {
  console.log('🌱 Starting safe posts seeding...');

  try {
    // 1. Fetch 25 random users to seed posts for
    const { rows: users } = await pool.query(
      'SELECT id, name FROM users LIMIT 30'
    );

    if (users.length === 0) {
      console.log('❌ No users found in database! Please seed users first.');
      process.exit(1);
    }

    console.log(`ℹ️ Seeding posts for ${users.length} users...`);

    let postCount = 0;
    let commentCount = 0;
    let reactionCount = 0;

    for (const user of users) {
      // Create 5 to 7 posts for each user
      const numPosts = Math.floor(Math.random() * 3) + 5; // 5, 6, or 7
      
      for (let i = 0; i < numPosts; i++) {
        const mockTemplate = MOCK_POSTS[Math.floor(Math.random() * MOCK_POSTS.length)];
        
        // Insert post
        const { rows: insertedPost } = await pool.query(
          `INSERT INTO posts (user_id, content, image, images, created_at, updated_at)
           VALUES ($1, $2, $3, '[]'::jsonb, NOW() - INTERVAL '1 hour' * $4, NOW())
           RETURNING id`,
          [user.id, mockTemplate.content, mockTemplate.image, Math.floor(Math.random() * 72)]
        );

        const postId = insertedPost[0].id;
        postCount++;

        // Add 2 to 4 random comments
        const numComments = Math.floor(Math.random() * 3) + 2;
        for (let c = 0; c < numComments; c++) {
          const commentUser = users[Math.floor(Math.random() * users.length)];
          const commentText = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];

          await pool.query(
            `INSERT INTO post_comments (post_id, user_id, text, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [postId, commentUser.id, commentText]
          );
          commentCount++;
        }

        // Add 3 to 6 random reactions
        const numReactions = Math.floor(Math.random() * 4) + 3;
        const reactedUserIds = new Set();
        
        for (let r = 0; r < numReactions; r++) {
          const reactionUser = users[Math.floor(Math.random() * users.length)];
          if (reactedUserIds.has(reactionUser.id)) continue; // prevent duplicate constraint error
          reactedUserIds.add(reactionUser.id);

          const reactionType = REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)];

          await pool.query(
            `INSERT INTO post_reactions (post_id, user_id, type, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [postId, reactionUser.id, reactionType]
          );
          reactionCount++;
        }
      }
    }

    console.log(`✅ Seeding complete!`);
    console.log(`📊 Stats:`);
    console.log(`   - Posts: ${postCount}`);
    console.log(`   - Comments: ${commentCount}`);
    console.log(`   - Reactions: ${reactionCount}`);

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    process.exit(0);
  }
};

seedPosts();
