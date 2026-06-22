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
  { content: 'Exciting things are coming soon! Stay tuned. 😉✨', image: '' },
  { content: 'Code, coffee, sleep, repeat. 💻☕😴', image: '' },
  { content: 'Just launched my portfolio site! Check it out.', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500' },
  { content: 'Exploring the beauty of minimalist architecture today.', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500' },
  { content: 'Is Tailwind CSS better than custom CSS? What do you think?', image: '' },
  { content: 'Enjoying a quiet rainy day with some good music. 🌧️🎵', image: '' }
];

const MOCK_COMMENTS = [
  'Wow, this looks amazing! 😍',
  'Totally agree with you on this one.',
  'Could you share the link or resource?',
  'Nice! Keep it up.',
  'This is super helpful, thanks for sharing!',
  'Interesting thoughts, would love to discuss more.',
  'Hahaha same here!',
  'Awesome share!',
  'Looks fantastic!',
  'Count me in!'
];

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

const seed10kPosts = async () => {
  console.log('🌱 Starting bulk seeding of 10,000 posts...');
  const startTime = Date.now();

  try {
    // 1. Fetch users
    const { rows: users } = await pool.query('SELECT id FROM users');
    if (users.length === 0) {
      console.log('❌ No users found in database! Please seed users first.');
      process.exit(1);
    }
    console.log(`📋 Found ${users.length} users in database.`);

    const totalPostsToSeed = 10000;
    const batchSize = 500;
    
    console.log(`🚀 Seeding ${totalPostsToSeed} posts in batches of ${batchSize}...`);

    let postsInserted = 0;
    const postIds = [];

    // Batch insert posts
    for (let i = 0; i < totalPostsToSeed; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalPostsToSeed - i);
      const values = [];
      const placeholders = [];
      let valIndex = 1;

      for (let j = 0; j < currentBatchSize; j++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const template = MOCK_POSTS[Math.floor(Math.random() * MOCK_POSTS.length)];
        const hoursAgo = Math.floor(Math.random() * 720); // spread over 30 days

        values.push(
          randomUser.id,
          template.content,
          template.image,
          '[]', // JSON images
          hoursAgo
        );

        placeholders.push(
          `($${valIndex}, $${valIndex + 1}, $${valIndex + 2}, $${valIndex + 3}::jsonb, NOW() - INTERVAL '1 hour' * $${valIndex + 4}, NOW())`
        );
        valIndex += 5;
      }

      const sql = `
        INSERT INTO posts (user_id, content, image, images, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
        RETURNING id
      `;

      const { rows } = await pool.query(sql, values);
      rows.forEach(r => postIds.push(r.id));
      postsInserted += rows.length;
      console.log(`   - Seeded ${postsInserted}/${totalPostsToSeed} posts...`);
    }

    // 2. Batch insert some reactions (e.g. 10,000 reactions)
    console.log('🚀 Seeding 10,000 reactions...');
    const totalReactions = 10000;
    let reactionsInserted = 0;

    for (let i = 0; i < totalReactions; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalReactions - i);
      const values = [];
      const placeholders = [];
      let valIndex = 1;
      const uniqueTracker = new Set();

      for (let j = 0; j < currentBatchSize; j++) {
        const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Avoid duplicate constraint on (post_id, user_id)
        const key = `${randomPostId}-${randomUser.id}`;
        if (uniqueTracker.has(key)) continue;
        uniqueTracker.add(key);

        const type = REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)];

        values.push(randomPostId, randomUser.id, type);
        placeholders.push(`($${valIndex}, $${valIndex + 1}, $${valIndex + 2}, NOW(), NOW())`);
        valIndex += 3;
      }

      if (values.length === 0) continue;

      const sql = `
        INSERT INTO post_reactions (post_id, user_id, type, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT DO NOTHING
      `;

      await pool.query(sql, values);
      reactionsInserted += (values.length / 3);
    }
    console.log(`   - Reacted ~${Math.floor(reactionsInserted)} times.`);

    // 3. Batch insert some comments (e.g. 5,000 comments)
    console.log('🚀 Seeding 5,000 comments...');
    const totalComments = 5000;
    let commentsInserted = 0;

    for (let i = 0; i < totalComments; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, totalComments - i);
      const values = [];
      const placeholders = [];
      let valIndex = 1;

      for (let j = 0; j < currentBatchSize; j++) {
        const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const text = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];

        values.push(randomPostId, randomUser.id, text);
        placeholders.push(`($${valIndex}, $${valIndex + 1}, $${valIndex + 2}, NOW(), NOW())`);
        valIndex += 3;
      }

      const sql = `
        INSERT INTO post_comments (post_id, user_id, text, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
      `;

      await pool.query(sql, values);
      commentsInserted += (values.length / 3);
    }
    console.log(`   - Commented ~${Math.floor(commentsInserted)} times.`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Seeding complete in ${duration}s!`);

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    process.exit(0);
  }
};

seed10kPosts();
