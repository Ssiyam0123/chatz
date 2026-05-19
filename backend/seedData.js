import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://yt:MNuNg1eKCoTi9cau@cluster0.kgw4w.mongodb.net/chatz?appName=Cluster0';

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const BIOS = [
  'Software Developer | Tech Enthusiast | Lover of code.',
  'Traveling the world one city at a time. ✈️',
  'Coffee lover, reader, and occasional writer.',
  'Building the future with JavaScript and React.',
  'Just a human doing human things.',
  'Fitness enthusiast | Health & Wellness coach.',
  'Exploring photography, capturing moments.',
  'Music is my escape. 🎸',
  'Living life to the fullest. ✨',
  'Foodie | Amateur chef | Dessert lover.'
];

const POST_TEMPLATES = [
  'Just finished a long coding session. Refactored the entire backend and it feels amazing!',
  'Had an incredible weekend hiking in the mountains. Nature always clears the mind. 🌲⛰️',
  'Currently learning React Native. The bridge and native rendering concept is fascinating!',
  'Who else agrees that a cup of coffee is the best debugging partner? ☕️💻',
  'Just watched a great documentary about space exploration. The universe is incredibly vast.',
  'Starting a new fitness challenge today. Consistent habits lead to big changes.',
  'Spent the afternoon reading a book by the lake. Best way to spend a Sunday.',
  'Finally got my new keyboard setup. The typing experience is so satisfying!',
  'Had an amazing dinner tonight with friends. Good food, great conversations.',
  'Every expert was once a beginner. Keep coding, keep building, keep learning!',
  'Woke up early to watch the sunrise today. Absolutely stunning view.',
  'Testing out this new social app. The UI is looking really clean and fast!',
  'Working on some new design systems today. Typography and spacing make all the difference.',
  'Sunday productivity: clean desk, fresh coffee, and side projects.',
  'Had a great workout session. Feeling energized and ready to take on the week!'
];

const POST_IMAGES = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600', // laptop
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600', // nature
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600', // forest
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600', // landscape
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600', // scenic
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600', // sunlight trees
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600'  // tech devices
];

const COMMENT_TEMPLATES = [
  'Totally agree with this!',
  'Wow, that looks amazing!',
  'Keep up the great work!',
  'Could not have said it better myself.',
  'This is so true.',
  'Awesome setup!',
  'Nice picture! Where was this taken?',
  'Super cool!',
  'Thanks for sharing!',
  'Love this! ❤️'
];

const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully. Generating user data...');

    // Hash password once to speed up execution
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [];
    const userIds = [];
    
    // Generate 150 users
    for (let i = 1; i <= 150; i++) {
      const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const name = `${first} ${last}`;
      const email = `dummy${i}_${Date.now()}@chatz.com`;
      const bio = BIOS[Math.floor(Math.random() * BIOS.length)];
      const avatar = `https://i.pravatar.cc/150?img=${(i % 70) + 1}`;
      
      const userId = new mongoose.Types.ObjectId();
      userIds.push(userId);

      // Random createdAt within last year
      const nowMs = Date.now();
      const oneYearAgoMs = nowMs - 365 * 24 * 60 * 60 * 1000;
      const userCreatedMs = oneYearAgoMs + Math.random() * (nowMs - oneYearAgoMs);
      const createdAt = new Date(userCreatedMs);

      users.push({
        _id: userId,
        name,
        email,
        password: hashedPassword,
        avatar,
        bio,
        publicKey: null,
        friends: [],
        createdAt,
        updatedAt: createdAt
      });
    }

    console.log(`Inserting ${users.length} dummy users...`);
    await mongoose.connection.db.collection('users').insertMany(users);
    console.log('Users inserted successfully. Generating posts...');

    const posts = [];
    const nowMs = Date.now();

    for (const userId of userIds) {
      // Determine number of posts for this user (between 20 and 30)
      const numPosts = Math.floor(Math.random() * 11) + 20;
      const userDoc = users.find(u => u._id === userId);
      const userCreatedMs = userDoc.createdAt.getTime();

      for (let j = 0; j < numPosts; j++) {
        // Random post date between user creation date and now
        const postMs = userCreatedMs + Math.random() * (nowMs - userCreatedMs);
        const createdAt = new Date(postMs);

        const content = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
        
        // 35% chance to have a post image
        let image = "";
        let images = [];
        if (Math.random() < 0.35) {
          image = POST_IMAGES[Math.floor(Math.random() * POST_IMAGES.length)];
          images = [image];
        }

        // Random reactions (between 0 and 6)
        const reactions = [];
        const numReactions = Math.floor(Math.random() * 7);
        const reactingUsers = new Set();
        while (reactingUsers.size < numReactions) {
          const randomUserIdx = Math.floor(Math.random() * userIds.length);
          reactingUsers.add(userIds[randomUserIdx]);
        }
        for (const reactorId of reactingUsers) {
          reactions.push({
            user: reactorId,
            type: REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)]
          });
        }

        // Random comments (between 0 and 4)
        const comments = [];
        const numComments = Math.floor(Math.random() * 5);
        for (let k = 0; k < numComments; k++) {
          const commenterId = userIds[Math.floor(Math.random() * userIds.length)];
          const text = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];
          // Comment is created after the post but before now
          const commentMs = postMs + Math.random() * (nowMs - postMs);
          comments.push({
            _id: new mongoose.Types.ObjectId(),
            user: commenterId,
            text,
            reactions: [],
            createdAt: new Date(commentMs)
          });
        }

        posts.push({
          user: userId,
          content,
          image,
          images,
          reactions,
          comments,
          shares: [],
          originalPost: null,
          createdAt,
          updatedAt: createdAt
        });
      }
    }

    console.log(`Inserting ${posts.length} posts...`);
    // Insert posts in batches of 1000 to be friendly with memory / socket packets
    const batchSize = 1000;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      await mongoose.connection.db.collection('posts').insertMany(batch);
      console.log(`Inserted posts ${i} to ${Math.min(i + batchSize, posts.length)}...`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
