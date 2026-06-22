import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import format from 'pg-format';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/pgDatabase.js';

// Configuration constants
const USERS_COUNT = 2000;
const POSTS_PER_USER_MIN = 40;
const POSTS_PER_USER_MAX = 50;
const GROUPS_COUNT = 50;
const MAX_MEMBERS_PER_GROUP = 40;
const FRIENDSHIP_RATE = 15; // Average friends per user (10 to 20 range)

// --- Bangladeshi Names & Bios Pool ---
// 151 Male First Names
const maleFirstNames = [
  'Rakib', 'Arif', 'Tanvir', 'Sajjad', 'Fahim', 'Mahdi', 'Naim', 'Asif', 'Sakib', 'Rony',
  'Imran', 'Joy', 'Shuvo', 'Faisal', 'Tamim', 'Mushfiq', 'Taskin', 'Mustafiz', 'Shakib', 'Sabbir',
  'Hasan', 'Mahmud', 'Robin', 'Alamin', 'Jahid', 'Riad', 'Nabil', 'Rashed', 'Raju', 'Kamrul',
  'Saif', 'Arafat', 'Zahid', 'Habib', 'Mizan', 'Rubel', 'Sentu', 'Milon', 'Masud', 'Selim',
  'Ashik', 'Bappi', 'Emon', 'Hridoy', 'Jewel', 'Liton', 'Maruf', 'Nayeem', 'Rifat', 'Sohan',
  'Tariq', 'Zeeshan', 'Amit', 'Anik', 'Apu', 'Biplob', 'Dipu', 'Farhan', 'Galib', 'Jamil',
  'Kazi', 'Mahir', 'Mashrafe', 'Mustafizur', 'Nahid', 'Opu', 'Parvez', 'Rafi', 'Raihan',
  'Ridoy', 'Rimon', 'Riyadh', 'Sabit', 'Sajid', 'Sarafat', 'Sayed', 'Shahadat', 'Shahin',
  'Shohel', 'Sourav', 'Subrata', 'Sujon', 'Sumon', 'Tanmoy', 'Tufan', 'Wasim', 'Yeasin',
  'Zafar', 'Ziad', 'Niloy', 'Shanto', 'Tutul', 'Rana', 'Palash', 'Riaz', 'Ferdous',
  'Shakil', 'Saikat', 'Shahriar', 'Shiplu', 'Shuvro', 'Munna', 'Akash', 'Tonmoy', 'Ariful',
  'Shorif', 'Mashiur', 'Redwan', 'Towhid', 'Hasib', 'Redoy', 'Fardin', 'Rasel', 'Monir',
  'Jalal', 'Helal', 'Belal', 'Ripon', 'Polash', 'Noyon', 'Shajal', 'Sajib', 'Russel',
  'Manik', 'Mukul', 'Sagar', 'Badhon', 'Babu', 'Mithu', 'Tipu', 'Topu', 'Shouvik',
  'Saad', 'Adnan', 'Rayhan', 'Mehrab', 'Jawad', 'Niaz', 'Rayan', 'Fatin', 'Safwan',
  'Wasi', 'Sami', 'Tahmid', 'Ahsan', 'Istiak', 'Istiaque', 'Mashiat', 'Nafis', 'Labib',
  'Irfan', 'Munim', 'Zamil'
];

// 151 Female First Names
const femaleFirstNames = [
  'Sadia', 'Fatima', 'Maria', 'Nusrat', 'Mim', 'Anika', 'Sumaiya', 'Jannatul', 'Afrin', 'Tasnim',
  'Riya', 'Tanjila', 'Fariha', 'Sabrina', 'Tabassum', 'Nabila', 'Farhana', 'Jerin', 'Eshita', 'Sarah',
  'Ayesha', 'Mehjabin', 'Tisha', 'Purnima', 'Mithila', 'Naila', 'Subah', 'Farah', 'Rumana', 'Sultana',
  'Adiba', 'Bushra', 'Humaira', 'Ishrat', 'Kaniz', 'Laboni', 'Mou', 'Pooja', 'Rida', 'Sobia',
  'Tahmina', 'Zarin', 'Akhi', 'Amena', 'Asma', 'Bithi', 'Dilara', 'Farida', 'Halima', 'Happy',
  'Hena', 'Huma', 'Jahanara', 'Khadija', 'Laila', 'Lipi', 'Lucky', 'Mitu', 'Monira', 'Nadia',
  'Nasrin', 'Nazma', 'Nilufa', 'Panna', 'Parvin', 'Priti', 'Rebecca', 'Rehana', 'Rina', 'Ripa',
  'Rokeya', 'Rozina', 'Ruma', 'Salma', 'Shahanaz', 'Shahida', 'Shahnaz', 'Shamima', 'Sharmin',
  'Shila', 'Shirin', 'Sonia', 'Sumi', 'Suraiya', 'Swapna', 'Tania', 'Taslima', 'Umme', 'Zinat',
  'Nipa', 'Dola', 'Kona', 'Shoma', 'Keya', 'Sharna', 'Trisha', 'Munni', 'Bristy', 'Asha',
  'Poly', 'Shanta', 'Tanni', 'Nova', 'Nodi', 'Juthi', 'Jhumur', 'Jui', 'Shifa', 'Sneha',
  'Payel', 'Oishi', 'Afsana', 'Arifa', 'Bina', 'Champa', 'Dolly', 'Eva', 'Fiza', 'Gita',
  'Ismat', 'Jaya', 'Koly', 'Lata', 'Mimi', 'Nupur', 'Opa', 'Pinky', 'Runu', 'Soma',
  'Toma', 'Urmi', 'Zeba', 'Simran', 'Tasmiah', 'Mayisha', 'Sanjida', 'Rubaiya', 'Farzana',
  'Samia', 'Meher', 'Lamia', 'Rifa', 'Humayra', 'Nuha', 'Raisa'
];

// Middle Names to create realistic 3-part names
const maleMiddleNames = [
  'Rahman', 'Hasan', 'Ahmed', 'Islam', 'Uddin', 'Iqbal', 'Hossain', 'Ali', 'Kalam', 'Jaman',
  'Munir', 'Siddique', 'Shahriar', 'Tasnim', 'Sadik', 'Pran', 'Kanti', 'Shekhar', 'Ranjan', ''
];

const femaleMiddleNames = [
  'Akter', 'Begum', 'Sultana', 'Jahan', 'Tabassum', 'Afrin', 'Anjum', 'Nahar', 'Khatun', 'Yasmin',
  'Fariha', 'Zaman', 'Chowdhury', 'Tasnim', 'Sarker', 'Roy', 'Devi', 'Rani', ''
];

// Last Names
const lastNames = [
  'Hasan', 'Rahman', 'Islam', 'Ahmed', 'Ali', 'Khan', 'Chowdhury', 'Hossain', 'Uddin', 'Sheikh',
  'Sarkar', 'Patwary', 'Bhuiyan', 'Talukder', 'Mahmud', 'Akter', 'Begum', 'Sultana', 'Jahan', 'Miah',
  'Howlader', 'Munshi', 'Molla', 'Dewan', 'Gazi', 'Majumder', 'Barua', 'Bhowmik', 'Das', 'Sen', 'Dutta'
];

const bioTemplates = [
  'Student at University of Dhaka (DU) 🎓',
  'Dhaka, Bangladesh 🇧🇩',
  'Software Engineer | Tech Enthusiast 💻',
  'Simple living, high thinking. ✨',
  'Love travelling, photography & food 📸✈️🍔',
  'Proud Bangladeshi 🇧🇩 | Dreamer 🌟',
  'CSE student at BUET ⚡',
  'Coffee lover ☕ | Bookworm 📚',
  'Work hard in silence, let success make the noise.',
  'Living life one day at a time 🌈',
  'Content Creator & Designer 🎨',
  'Addicted to tea (Cha) ☕',
  'Cricket is in my blood 🏏',
  'Exploring the beauty of Bangladesh 🌾🌊',
  'Entrepreneur | Startup Enthusiast 🚀',
  'Freelance developer & blogger 📝',
  'Always keep smiling 😊',
  'Alhamdulillah for everything 🤲',
  'Music is my escape 🎵',
  'Just another human trying to make a difference.'
];

const postTexts = [
  'Dhaka er traffic to din din unbearable hoye jacche! 😫🚗',
  'Ajke campus e khub sundor ekta din katlo. University of Dhaka is love! ❤️🏫',
  'Alhamdulillah, got my first job offer today! Keep me in your prayers. 💼🙏',
  'Kacchi vs Tehari? Which one is your ultimate favorite? 🍛👇',
  'Rainy day + hot Khichuri + Hilsa fish = perfect combo! 🌧️🐟🍛',
  'Sajek valley er chobi dekhlei mon ta bhalo hoye jay. Sajek jete icche korche abar! 🏞️☁️',
  'Any tech enthusiasts here? What is your take on AI replacing software engineering? 💻🤖',
  'Bangladesh er cricket team er eirokom performance khub e disappoint korlo. 🏏💔',
  'Ajke shokale Cox\'s Bazar er beach side theke surjodoy dekhlam. Amazing view! 🌊🌅',
  'Cha lover der jonno Tsc er cha er bikal ta onnorokom ekta anondo! ☕❤️',
  'Dhaka food blogging is getting out of hand. Sob jaigay "cheesy" ar "juicy" r hype! 🍔🤣',
  'Weekend means spending time with family and close friends. 🏡❤️',
  'Struggling with current electricity load shedding. Neondb is stable but my router is off! ⚡💡',
  'Sylhet er Ratargul Swamp Forest er natural beauty sotti chokh jorano. 🌲🚣',
  'Completed a new coding project today. React and Node.js are awesome! 🚀💻',
  'Ajke khub icche korche puran dhaka er Bakarkhani ar tea khete! ☕🫓',
  'Anyone planning to visit Saint Martin island this year? 🏝️🌊',
  'Life is too short to argue. Just say "Accha thik ache" and move on. 🤫😅',
  'Bangla rock music playlist on repeat. Artcell ar Warfaze er gaan gular kono tulona hoy na! 🎸🎵',
  'Alhamdulillah for all the blessings in life. 🤲✨',
  'Exploring the old lanes of Puran Dhaka. The heritage is so rich! 🕌🧱',
  'Dhaka metro rail saved us from massive traffic today. Thank goodness! 🚇🙌',
  'Coding late night with a cup of black coffee. Best feeling ever. 💻☕🌃',
  'What is the best bookstore in Dhaka? Looking for some classic books. 📚📖',
  'Just visited the National Parliament building. Louis Kahn\'s masterpiece! 🏛️🇧🇩',
  'Shit kaler pitha-puli khawar moja e alada. Bhapa pitha is love! ❄️🥞',
  'Dreaming of visiting Kashmir or Himachal someday. 🏔️✈️',
  'Success doesn\'t come overnight. It takes consistency, dedication, and hard work. 💪🌟',
  'Bikal er aakash ta khub e sundor chilo ajke. Dhaka rooftops are a vibe! 🌇☁️',
  'Listening to old Hemanta and Manna Dey songs. Absolute gold. 🎵📻'
];

const commentTexts = [
  'Bhalo chilo bro! 👍',
  'Nice post! 💯',
  'Ha ha ha, thik bolechen!',
  'Alhamdulillah! 🤲',
  'Sotti sundor chobi ta. 📸',
  'Valo laglo post ta pore.',
  'Dhaka er traffic asholei baje. 🚗😫',
  'Great job, congratulations! 🎉',
  'Agreed! 🙌',
  'Tsc er cha asholei awesome. ☕',
  'Amio eita bhabtechi!',
  'Tehari is always best! 🍛',
  'Sajek jete hobe abar.',
  'Inspirational writing! ✨',
  'So true!'
];

const chatTexts = [
  'Ki obostha?',
  'Kothay tui?',
  'Ajke TSC e ashbi?',
  'Ekta help lagbe.',
  'Kemon achis?',
  'Khabar khaichis?',
  'Ha thik ache.',
  'Pore kotha hobe.',
  'Bujhlam.',
  'Hae hobe.',
  'Oikhan theke kkhn firbi?',
  'Call de ekbar.',
  'Hahaha, crazy!',
  'Alhamdulillah, ami bhalo achi.',
  'Okay bro, see you!'
];

const groupNames = [
  'DU Batch 2026 🎓',
  'Dhaka Foodies Club 🍔',
  'Developers BD 💻',
  'Cricket Addicts BD 🏏',
  'Sajek Travellers 🏞️',
  'BUET CSE Developers ⚡',
  'Rooftop Musicians 🎸',
  'Puran Dhaka Food Lovers 🍛',
  'Dhaka Metro Daily Chat 🚇',
  'Book Club Bangladesh 📚'
];

// Helper to generate a random date in the last 2 years
function getRandomDateInLast2Years() {
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
  return new Date(randomTime);
}

// Helper to generate a random date between two dates
function getRandomDateBetween(start, end) {
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

const runSeeder = async () => {
  console.log('🚀 Starting Massive Bangladeshi Database Seeding...');
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    console.log('🧹 Clearing all existing data (TRUNCATE CASCADE)...');
    await client.query(`
      TRUNCATE TABLE 
        users, 
        user_friends, 
        messages, 
        groups, 
        group_members, 
        group_messages, 
        friend_requests, 
        posts, 
        post_reactions, 
        post_comments, 
        post_comment_reactions, 
        post_shares,
        stories, 
        story_viewers,
        conversations,
        conversation_members,
        message_status,
        group_message_status
      CASCADE;
    `);

    console.log('⏳ Hashing default password (123456)...');
    const defaultPassword = await bcrypt.hash('123456', 10);

    // ─── 1. GENERATE USERS ──────────────────────────────────────────────────
    console.log(`👤 Generating ${USERS_COUNT} Bangladeshi Users (with unique 3-part names)...`);
    const usersData = [];
    const userEmails = new Set();
    const userNames = new Set();
    const userIds = [];
    const usersCreatedDates = {}; // Track user registration date to keep consistent timelines

    for (let i = 0; i < USERS_COUNT; i++) {
      let fullName = '';
      let firstName = '';
      let lastName = '';
      const isMale = i % 2 === 0;

      let attemptsName = 0;
      do {
        firstName = isMale 
          ? faker.helpers.arrayElement(maleFirstNames) 
          : faker.helpers.arrayElement(femaleFirstNames);
          
        const middleName = isMale
          ? faker.helpers.arrayElement(maleMiddleNames)
          : faker.helpers.arrayElement(femaleMiddleNames);
          
        lastName = faker.helpers.arrayElement(lastNames);
        
        const includeMiddle = faker.datatype.boolean(0.75) && middleName !== '';
        fullName = includeMiddle ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
        attemptsName++;
      } while ((userNames.has(fullName) || fullName === '') && attemptsName < 100);

      if (attemptsName >= 100) {
        // Append unique index to guarantee uniqueness in case of pool collision
        fullName = `${fullName} ${faker.number.int({ min: 10, max: 9999 })}`;
      }
      userNames.add(fullName);

      const emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${faker.number.int({ min: 10, max: 9999 })}`;
      let email = `${emailBase}@gmail.com`;
      while (userEmails.has(email)) {
        email = `${emailBase}.${faker.number.int({ min: 1, max: 9999 })}@gmail.com`;
      }
      userEmails.add(email);

      const id = uuidv4();
      userIds.push(id);
      
      const regDate = getRandomDateInLast2Years();
      usersCreatedDates[id] = regDate;

      // Random avatars (high-quality Pravatar URLs)
      const avatarUrl = `https://i.pravatar.cc/150?img=${(i % 70) + 1}`;
      const coverPhoto = `https://picsum.photos/1200/400?random=${i}`;
      const bio = faker.helpers.arrayElement(bioTemplates);

      usersData.push([
        id,
        fullName,
        email,
        defaultPassword,
        avatarUrl,
        bio,
        '', // public_key
        coverPhoto,
        regDate,
        regDate,
        true, // email_verified
        regDate // password_changed_at
      ]);
    }

    // Insert users in chunks of 500
    for (let i = 0; i < usersData.length; i += 500) {
      const chunk = usersData.slice(i, i + 500);
      const sql = format(
        'INSERT INTO users (id, name, email, password, avatar, bio, public_key, cover_photo, created_at, updated_at, email_verified, password_changed_at) VALUES %L',
        chunk
      );
      await client.query(sql);
    }
    console.log(`✅ Inserted ${userIds.length} users.`);

    // ─── 2. GENERATE FRIENDSHIPS ────────────────────────────────────────────
    console.log(`🤝 Generating Friendships & Friend Requests...`);
    const friendsData = [];
    const friendRequestsData = [];
    const friendPairs = new Set();
    const now = new Date();

    // Map to quickly get user's friends list
    const userFriendsMap = new Map();
    userIds.forEach(id => userFriendsMap.set(id, []));

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const targetFriendCount = faker.number.int({ min: 10, max: FRIENDSHIP_RATE * 2 });
      const currentFriends = userFriendsMap.get(userId);

      if (currentFriends.length >= targetFriendCount) continue;

      const needed = targetFriendCount - currentFriends.length;
      let attempts = 0;

      while (userFriendsMap.get(userId).length < targetFriendCount && attempts < 100) {
        attempts++;
        const friendIndex = faker.number.int({ min: 0, max: userIds.length - 1 });
        const friendId = userIds[friendIndex];

        if (userId === friendId) continue;

        const pairKey = userId < friendId ? `${userId}_${friendId}` : `${friendId}_${userId}`;
        if (!friendPairs.has(pairKey)) {
          const friendOfFriend = userFriendsMap.get(friendId);
          if (friendOfFriend.length >= FRIENDSHIP_RATE * 2) continue;

          // Friendship date must be after both users registered
          const u1Date = usersCreatedDates[userId];
          const u2Date = usersCreatedDates[friendId];
          const startFriendshipDate = u1Date > u2Date ? u1Date : u2Date;
          const friendshipDate = getRandomDateBetween(startFriendshipDate, now);

          // Bidirectional rows
          friendsData.push([uuidv4(), userId, friendId, friendshipDate, friendshipDate]);
          friendsData.push([uuidv4(), friendId, userId, friendshipDate, friendshipDate]);

          // Corresponding Friend Request
          friendRequestsData.push([uuidv4(), userId, friendId, 'accepted', friendshipDate, friendshipDate]);

          friendPairs.add(pairKey);
          currentFriends.push(friendId);
          friendOfFriend.push(userId);
        }
      }
    }

    // Insert friendships in chunks of 5000
    if (friendsData.length > 0) {
      for (let i = 0; i < friendsData.length; i += 5000) {
        const chunk = friendsData.slice(i, i + 5000);
        await client.query(format('INSERT INTO user_friends (id, user_id, friend_id, created_at, updated_at) VALUES %L', chunk));
      }
    }

    // Insert friend requests in chunks of 5000
    if (friendRequestsData.length > 0) {
      for (let i = 0; i < friendRequestsData.length; i += 5000) {
        const chunk = friendRequestsData.slice(i, i + 5000);
        await client.query(format('INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES %L', chunk));
      }
    }
    console.log(`✅ Inserted ${friendsData.length / 2} friendships (bidirectional, so ${friendsData.length} records) and friend requests.`);

    // ─── 3. POSTS ──────────────────────────────────────────────────────────
    console.log(`📝 Generating Posts & Interactions (Reactions, Comments, Shares)...`);
    const postsData = [];
    const postIds = [];
    const postDates = {}; // Map post ID -> creation date
    const postAuthors = {}; // Map post ID -> author user ID

    // Determine post counts first
    for (const userId of userIds) {
      const numPosts = faker.number.int({ min: POSTS_PER_USER_MIN, max: POSTS_PER_USER_MAX });
      const userRegDate = usersCreatedDates[userId];

      for (let i = 0; i < numPosts; i++) {
        const id = uuidv4();
        postIds.push(id);
        const postDate = getRandomDateBetween(userRegDate, now);
        postDates[id] = postDate;
        postAuthors[id] = userId;

        const hasImage = faker.datatype.boolean(0.35); // 35% chance of image
        const content = faker.datatype.boolean(0.6) 
          ? faker.helpers.arrayElement(postTexts)
          : faker.lorem.paragraph();
        
        const imageUrl = hasImage ? `https://picsum.photos/800/600?random=${faker.number.int()}` : '';

        postsData.push([
          id,
          userId,
          content,
          imageUrl,
          '[]', // JSON array of images
          null, // original_post_id
          postDate,
          postDate
        ]);
      }
    }

    // Insert posts in chunks of 2000
    for (let i = 0; i < postsData.length; i += 2000) {
      const chunk = postsData.slice(i, i + 2000);
      await client.query(format('INSERT INTO posts (id, user_id, content, image, images, original_post_id, created_at, updated_at) VALUES %L', chunk));
    }
    console.log(`✅ Inserted ${postIds.length} posts.`);

    // ─── 4. GENERATE POST REACTIONS, COMMENTS & SHARES ─────────────────────
    console.log(`💬 Generating post reactions, comments, and shares (Streaming to DB)...`);
    
    let reactionsBuffer = [];
    let commentsBuffer = [];
    let sharesBuffer = [];
    
    const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

    for (const postId of postIds) {
      const postDate = postDates[postId];
      const authorId = postAuthors[postId];
      const friends = userFriendsMap.get(authorId) || [];

      if (friends.length === 0) continue;

      // Reactions: 5 to 20 per post
      const numReactions = faker.number.int({ min: 5, max: 20 });
      const reactedUsers = new Set();
      for (let r = 0; r < numReactions; r++) {
        const reactorId = friends.length > 0 && faker.datatype.boolean(0.85)
          ? faker.helpers.arrayElement(friends)
          : faker.helpers.arrayElement(userIds);

        if (reactorId !== authorId && !reactedUsers.has(reactorId)) {
          reactedUsers.add(reactorId);
          
          const reactorReg = usersCreatedDates[reactorId];
          const interactionStart = reactorReg > postDate ? reactorReg : postDate;
          const reactionDate = getRandomDateBetween(interactionStart, now);

          reactionsBuffer.push([
            uuidv4(),
            postId,
            reactorId,
            faker.helpers.arrayElement(reactionTypes),
            reactionDate,
            reactionDate
          ]);
        }
      }

      // Comments: 1 to 5 per post
      const numComments = faker.number.int({ min: 1, max: 5 });
      for (let c = 0; c < numComments; c++) {
        const commenterId = friends.length > 0 && faker.datatype.boolean(0.85)
          ? faker.helpers.arrayElement(friends)
          : faker.helpers.arrayElement(userIds);

        const commenterReg = usersCreatedDates[commenterId];
        const interactionStart = commenterReg > postDate ? commenterReg : postDate;
        const commentDate = getRandomDateBetween(interactionStart, now);
        
        const commentText = faker.datatype.boolean(0.7)
          ? faker.helpers.arrayElement(commentTexts)
          : faker.lorem.sentence();

        commentsBuffer.push([
          uuidv4(),
          postId,
          commenterId,
          commentText,
          commentDate,
          commentDate
        ]);
      }

      // Shares: 0 to 2 per post
      const numShares = faker.number.int({ min: 0, max: 2 });
      const sharedUsers = new Set();
      for (let s = 0; s < numShares; s++) {
        const sharerId = friends.length > 0 && faker.datatype.boolean(0.85)
          ? faker.helpers.arrayElement(friends)
          : faker.helpers.arrayElement(userIds);

        if (sharerId !== authorId && !sharedUsers.has(sharerId)) {
          sharedUsers.add(sharerId);

          const sharerReg = usersCreatedDates[sharerId];
          const interactionStart = sharerReg > postDate ? sharerReg : postDate;
          const shareDate = getRandomDateBetween(interactionStart, now);

          sharesBuffer.push([
            uuidv4(),
            postId,
            sharerId,
            shareDate,
            shareDate
          ]);
        }
      }

      // --- Stream Reaction Buffer ---
      if (reactionsBuffer.length >= 10000) {
        await client.query(format(
          'INSERT INTO post_reactions (id, post_id, user_id, type, created_at, updated_at) VALUES %L ON CONFLICT DO NOTHING',
          reactionsBuffer
        ));
        reactionsBuffer = [];
      }

      // --- Stream Comment Buffer ---
      if (commentsBuffer.length >= 5000) {
        await client.query(format(
          'INSERT INTO post_comments (id, post_id, user_id, text, created_at, updated_at) VALUES %L',
          commentsBuffer
        ));
        commentsBuffer = [];
      }

      // --- Stream Shares Buffer ---
      if (sharesBuffer.length >= 5000) {
        await client.query(format(
          'INSERT INTO post_shares (id, post_id, user_id, created_at, updated_at) VALUES %L ON CONFLICT DO NOTHING',
          sharesBuffer
        ));
        sharesBuffer = [];
      }
    }

    // Insert remaining buffered reactions
    if (reactionsBuffer.length > 0) {
      await client.query(format(
        'INSERT INTO post_reactions (id, post_id, user_id, type, created_at, updated_at) VALUES %L ON CONFLICT DO NOTHING',
        reactionsBuffer
      ));
    }
    // Insert remaining buffered comments
    if (commentsBuffer.length > 0) {
      await client.query(format(
        'INSERT INTO post_comments (id, post_id, user_id, text, created_at, updated_at) VALUES %L',
        commentsBuffer
      ));
    }
    // Insert remaining buffered shares
    if (sharesBuffer.length > 0) {
      await client.query(format(
        'INSERT INTO post_shares (id, post_id, user_id, created_at, updated_at) VALUES %L ON CONFLICT DO NOTHING',
        sharesBuffer
      ));
    }
    console.log(`✅ Seeding reactions, comments, and shares finished.`);

    // ─── 5. GROUPS & MEMBERS ────────────────────────────────────────────────
    console.log(`👥 Generating Groups...`);
    const groupsData = [];
    const groupIds = [];
    
    for (let i = 0; i < GROUPS_COUNT; i++) {
      const id = uuidv4();
      const creatorId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })];
      const name = faker.helpers.arrayElement(groupNames);
      const avatarUrl = `https://picsum.photos/400/400?random=${faker.number.int()}`;
      
      const creatorReg = usersCreatedDates[creatorId];
      const groupDate = getRandomDateBetween(creatorReg, now);

      groupIds.push({ id, creatorId, created_at: groupDate });
      groupsData.push([
        id,
        name,
        creatorId,
        avatarUrl,
        groupDate,
        groupDate
      ]);
    }

    await client.query(format('INSERT INTO groups (id, name, creator_id, avatar, created_at, updated_at) VALUES %L', groupsData));

    // Group memberships
    const groupMembersData = [];
    for (const group of groupIds) {
      groupMembersData.push([uuidv4(), group.id, group.creatorId, 'admin']);

      const numMembers = faker.number.int({ min: 10, max: MAX_MEMBERS_PER_GROUP });
      const memberIds = new Set([group.creatorId]);

      while (memberIds.size < numMembers) {
        const randUserId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })];
        if (!memberIds.has(randUserId)) {
          memberIds.add(randUserId);
          groupMembersData.push([uuidv4(), group.id, randUserId, 'member']);
        }
      }
    }

    // Insert group members
    for (let i = 0; i < groupMembersData.length; i += 5000) {
      const chunk = groupMembersData.slice(i, i + 5000);
      await client.query(format('INSERT INTO group_members (id, group_id, user_id, role) VALUES %L ON CONFLICT DO NOTHING', chunk));
    }
    console.log(`✅ Inserted ${groupIds.length} groups and ${groupMembersData.length} group members.`);

    // ─── 6. MESSAGES (Private & Group) ──────────────────────────────────────
    console.log(`💌 Generating DMs & Group Messages...`);
    const privateMessagesData = [];
    const groupMessagesData = [];

    const uniqueFriendships = [];
    const pairTracker = new Set();

    for (const item of friendsData) {
      const u1 = item[1];
      const u2 = item[2];
      const key = u1 < u2 ? `${u1}_${u2}` : `${u2}_${u1}`;
      if (!pairTracker.has(key)) {
        pairTracker.add(key);
        uniqueFriendships.push({ u1, u2, friendshipDate: item[3] });
      }
    }

    const activeChatsCount = Math.floor(uniqueFriendships.length * 0.3);
    const selectedChats = faker.helpers.shuffle(uniqueFriendships).slice(0, activeChatsCount);

    console.log(`   Generating direct messages for ${selectedChats.length} active chats...`);
    for (const chat of selectedChats) {
      const numMsgs = faker.number.int({ min: 10, max: 40 });
      for (let i = 0; i < numMsgs; i++) {
        const isU1Sender = faker.datatype.boolean();
        const sender = isU1Sender ? chat.u1 : chat.u2;
        const receiver = isU1Sender ? chat.u2 : chat.u1;

        const msgDate = getRandomDateBetween(chat.friendshipDate, now);
        const text = faker.helpers.arrayElement(chatTexts);

        privateMessagesData.push([
          uuidv4(),
          sender,
          receiver,
          text,
          null, // image
          null, // ciphertext
          null, // nonce
          false, // is_encrypted
          msgDate,
          msgDate,
          null // deleted_at
        ]);
      }
    }

    // Generate messages for groups
    console.log(`   Generating messages for ${groupIds.length} groups...`);
    
    const groupMembersMap = new Map();
    groupMembersData.forEach(([id, groupId, userId]) => {
      if (!groupMembersMap.has(groupId)) groupMembersMap.set(groupId, []);
      groupMembersMap.get(groupId).push(userId);
    });

    for (const group of groupIds) {
      const members = groupMembersMap.get(group.id) || [];
      if (members.length === 0) continue;

      const numMsgs = faker.number.int({ min: 20, max: 80 });
      for (let i = 0; i < numMsgs; i++) {
        const senderId = faker.helpers.arrayElement(members);
        const msgDate = getRandomDateBetween(group.created_at, now);
        const text = faker.helpers.arrayElement(chatTexts);

        groupMessagesData.push([
          uuidv4(),
          group.id,
          senderId,
          text,
          null, // image
          msgDate,
          msgDate
        ]);
      }
    }

    // Insert private DMs in chunks of 5000
    if (privateMessagesData.length > 0) {
      for (let i = 0; i < privateMessagesData.length; i += 5000) {
        const chunk = privateMessagesData.slice(i, i + 5000);
        await client.query(format(
          'INSERT INTO messages (id, sender_id, receiver_id, text, image, ciphertext, nonce, is_encrypted, created_at, updated_at, deleted_at) VALUES %L',
          chunk
        ));
      }
    }

    // Insert group messages in chunks of 5000
    if (groupMessagesData.length > 0) {
      for (let i = 0; i < groupMessagesData.length; i += 5000) {
        const chunk = groupMessagesData.slice(i, i + 5000);
        await client.query(format(
          'INSERT INTO group_messages (id, group_id, sender_id, text, image, created_at, updated_at) VALUES %L',
          chunk
        ));
      }
    }
    console.log(`✅ Inserted ${privateMessagesData.length} direct messages and ${groupMessagesData.length} group messages.`);

    // ─── 7. BACKFILL CONVERSATIONS & STATUSES (SQL QUERY) ───────────────────
    console.log('🔄 Executing database SQL backfills...');

    // A. Direct conversations
    console.log('   -> Backfilling direct conversations...');
    await client.query(`
      INSERT INTO conversations (
        type, participant_lo, participant_hi,
        last_message_at, last_message_preview,
        last_message_is_encrypted, last_message_image
      )
      SELECT
        'direct'::conversation_type,
        pairs.lo,
        pairs.hi,
        pairs.last_at,
        CASE WHEN pairs.last_is_encrypted THEN NULL
             WHEN pairs.last_image IS NOT NULL THEN '📷 Image'
             ELSE pairs.last_text END,
        pairs.last_is_encrypted,
        (pairs.last_image IS NOT NULL)
      FROM (
        SELECT DISTINCT ON (LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id))
          LEAST(m.sender_id, m.receiver_id)   AS lo,
          GREATEST(m.sender_id, m.receiver_id) AS hi,
          m.created_at                         AS last_at,
          m.is_encrypted                       AS last_is_encrypted,
          m.image                              AS last_image,
          m.text                               AS last_text
        FROM messages m
        ORDER BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id), m.created_at DESC
      ) pairs
      ON CONFLICT (participant_lo, participant_hi) WHERE type = 'direct'
      DO UPDATE SET
        last_message_at           = EXCLUDED.last_message_at,
        last_message_preview      = EXCLUDED.last_message_preview,
        last_message_is_encrypted = EXCLUDED.last_message_is_encrypted,
        last_message_image        = EXCLUDED.last_message_image,
        updated_at                = now();
    `);

    // B. Direct conversation members
    console.log('   -> Backfilling direct conversation members...');
    await client.query(`
      INSERT INTO conversation_members (conversation_id, user_id)
      SELECT c.id, x.user_id
      FROM conversations c
      CROSS JOIN LATERAL (
        VALUES (c.participant_lo), (c.participant_hi)
      ) AS x(user_id)
      WHERE c.type = 'direct'
      ON CONFLICT DO NOTHING;
    `);

    // C. Group conversations
    console.log('   -> Backfilling group conversations...');
    await client.query(`
      INSERT INTO conversations (type, group_id, created_at)
      SELECT 'group'::conversation_type, g.id, g.created_at
      FROM groups g
      ON CONFLICT (group_id) WHERE type = 'group' DO NOTHING;
    `);

    // D. Group conversation latest message refresh
    console.log('   -> Updating group conversation latest messages...');
    await client.query(`
      UPDATE conversations c
         SET last_message_at      = sub.last_at,
             last_message_preview = sub.preview,
             last_message_image   = sub.has_image,
             updated_at           = now()
        FROM (
          SELECT
            gm.group_id,
            MAX(gm.created_at) AS last_at,
            (ARRAY_AGG(gm.text     ORDER BY gm.created_at DESC))[1] AS last_text,
            (ARRAY_AGG(gm.image    ORDER BY gm.created_at DESC))[1] AS last_image
          FROM group_messages gm
          GROUP BY gm.group_id
        ) agg
      CROSS JOIN LATERAL (
        SELECT
          agg.last_at,
          CASE WHEN agg.last_image IS NOT NULL THEN '📷 Image' ELSE agg.last_text END AS preview,
          (agg.last_image IS NOT NULL) AS has_image
      ) sub
      WHERE c.type = 'group' AND c.group_id = agg.group_id;
    `);

    // E. Group conversation members
    console.log('   -> Backfilling group conversation members...');
    await client.query(`
      INSERT INTO conversation_members (conversation_id, user_id)
      SELECT c.id, gm.user_id
      FROM conversations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.type = 'group'
      ON CONFLICT DO NOTHING;
    `);

    // F. DM read/delivered statuses
    console.log('   -> Creating direct message read statuses...');
    await client.query(`
      INSERT INTO message_status (message_id, user_id, delivered_at, read_at, created_at, updated_at)
      SELECT 
        m.id, 
        m.receiver_id, 
        m.created_at, 
        CASE 
          -- If message is older than 2 hours, it's read (read_at is generated with a small delay)
          WHEN m.created_at < NOW() - INTERVAL '2 hours' THEN m.created_at + (random() * INTERVAL '15 minutes')
          -- If message is recent, 85% chance it's read, 15% chance it's unread (NULL)
          WHEN random() < 0.85 THEN m.created_at + (random() * INTERVAL '15 minutes')
          ELSE NULL 
        END, 
        m.created_at, 
        m.created_at
      FROM messages m
      ON CONFLICT DO NOTHING;
    `);

    // G. Group message read/delivered statuses
    console.log('   -> Creating group message read statuses...');
    await client.query(`
      INSERT INTO group_message_status (message_id, group_id, user_id, delivered_at, read_at, created_at, updated_at)
      SELECT 
        gm.id,
        gm.group_id,
        gmember.user_id,
        gm.created_at,
        CASE 
          -- If message is older than 4 hours, it's read
          WHEN gm.created_at < NOW() - INTERVAL '4 hours' THEN gm.created_at + (random() * INTERVAL '30 minutes')
          -- If message is recent, 80% chance it's read, 20% chance it's unread (NULL)
          WHEN random() < 0.80 THEN gm.created_at + (random() * INTERVAL '30 minutes')
          ELSE NULL 
        END, 
        gm.created_at, 
        gm.created_at
      FROM group_messages gm
      JOIN group_members gmember ON gm.group_id = gmember.group_id
      WHERE gmember.user_id != gm.sender_id
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Seeding successfully completed in ${duration}s!`);
    console.log(`\n🔑 You can log in using any seeded user's email, for example:`);
    console.log(`Email: ${usersData[0][2]}`);
    console.log(`Password: 123456\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
  } finally {
    client.release();
    pool.end();
  }
};

runSeeder();
