import dotenv from 'dotenv';
import { User, Post } from './src/models/index.js';
import sequelize from './src/config/database.js';

dotenv.config();

const NAMES = [
  'Aarif Rahman', 'Anika Tabassum', 'Farhan Ishraq', 'Humayra Kabir', 'Imtiaz Ahmed',
  'Jannatul Ferdous', 'Kazi Mahbub', 'Labiba Salsabil', 'Mushfiqur Rahim', 'Nabila Islam',
  'Obaidul Haque', 'Priti Chowdhury', 'Quazi Anis', 'Rashedul Bari', 'Sadia Afrin',
  'Tahmid Hasan', 'Tasnim Zara', 'Waseka Saba', 'Yasir Arafat', 'Zarin Tasnim',
  'Ashraful Alam', 'Bipasha Hayat', 'Chanchal Chowdhury', 'Dilara Begum', 'Emon Khan',
  'Faria Shahrin', 'Golam Mustafa', 'Hasan Masood', 'Ishika Khan', 'Jaya Ahsan'
];

const POST_CONTENTS = [
  "Just started learning React Native, it's awesome! 📱",
  "Beautiful morning in Dhaka! ☀️ #DhakaLife",
  "Had an amazing dinner tonight. 🍔🍟",
  "Who else is working late tonight? 💻 #developer",
  "Thinking about taking a vacation soon. Any recommendations?",
  "Successfully connected Neon DB to Sequelize! 🚀",
  "Excited to start our new project chat-z!",
  "Coffee is my developer fuel. ☕️",
  "Listening to some old classic Bengali songs. 🎶",
  "Rainy days and a good book 🌧️📚",
  "Finally solved that persistent bug! What a feeling. 😎",
  "Spent the weekend coding. Time well spent.",
  "Looking for remote React/Node JS developer roles.",
  "A nice walk in the park helps clear the mind.",
  "Happy Friday everyone! Have a great weekend. 🎉"
];

function getRandomDateInLastYear() {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  const randomTimestamp = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  return new Date(randomTimestamp);
}

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('🔌 Connected to database for seeding...');

    // We don't drop existing users/posts to prevent deleting user's own tests.
    // Instead we just insert the new fake data.

    console.log(`🌱 Creating 30 fake users...`);
    const usersToCreate = NAMES.map((name, index) => {
      const email = `user${index + 1}@example.com`;
      return {
        name,
        email,
        password: 'password123', // hooks in User model will hash this automatically
        bio: `Hello! I am ${name}. Passionate about technology and connecting with people.`,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      };
    });

    // We do it one by one or in bulk. Since hooks hash passwords, we should use bulkCreate with individualHooks: true
    const createdUsers = await User.bulkCreate(usersToCreate, { individualHooks: true });
    console.log(`✅ Created ${createdUsers.length} users successfully.`);

    console.log(`🌱 Creating posts for the users spanning the last 1 year...`);
    const postsToCreate = [];

    for (const user of createdUsers) {
      // 5 to 12 posts per user
      const postCount = Math.floor(Math.random() * 8) + 5;
      for (let i = 0; i < postCount; i++) {
        const date = getRandomDateInLastYear();
        const content = POST_CONTENTS[Math.floor(Math.random() * POST_CONTENTS.length)];
        postsToCreate.push({
          userId: user.id,
          content,
          createdAt: date,
          updatedAt: date
        });
      }
    }

    // bulkCreate posts. Since posts don't have custom hooks that we need to trigger, normal bulkCreate is fine
    const createdPosts = await Post.bulkCreate(postsToCreate);
    console.log(`✅ Created ${createdPosts.length} posts successfully.`);
    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await sequelize.close();
  }
}

seed();
