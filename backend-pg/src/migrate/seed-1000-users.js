import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import format from 'pg-format';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/pgDatabase.js';

const SEED_COUNT = 1000;
const POSTS_PER_USER_MAX = 3;
const GROUPS_COUNT = 50;
const MAX_MEMBERS_PER_GROUP = 15;
const MAX_FRIENDS = 20;

const runSeeder = async () => {
  console.log('🚀 Starting Massive Database Seeding...');
  const client = await pool.connect();

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
        stories, 
        story_viewers 
      CASCADE;
    `);

    console.log('⏳ Hashing default password (123456)...');
    const defaultPassword = await bcrypt.hash('123456', 10);
    const now = new Date();

    // ─── 1. USERS ─────────────────────────────────────────────────────────────
    console.log(`👤 Generating ${SEED_COUNT} Users...`);
    const usersData = [];
    const userEmails = new Set();
    const userIds = [];
    
    for (let i = 0; i < SEED_COUNT; i++) {
      let email;
      do {
        email = faker.internet.email().toLowerCase();
      } while (userEmails.has(email));
      userEmails.add(email);

      const id = uuidv4();
      userIds.push(id);
      usersData.push([
        id,
        faker.person.fullName(),
        email,
        defaultPassword,
        faker.image.avatar(),
        faker.person.bio(),
        '', // public_key
        faker.image.urlLoremFlickr({ category: 'nature' }), // cover_photo
        now,
        now
      ]);
    }

    const userSql = format(
      'INSERT INTO users (id, name, email, password, avatar, bio, public_key, cover_photo, created_at, updated_at) VALUES %L',
      usersData
    );
    await client.query(userSql);
    console.log(`✅ Inserted ${userIds.length} users.`);

    // ─── 2. USER FRIENDS ──────────────────────────────────────────────────────
    console.log(`🤝 Generating Friendships...`);
    const friendsData = [];
    const friendPairs = new Set();

    for (const userId of userIds) {
      const numFriends = faker.number.int({ min: 1, max: MAX_FRIENDS });
      const shuffled = [...userIds].sort(() => 0.5 - Math.random());
      const selected = shuffled.filter(id => id !== userId).slice(0, numFriends);

      for (const friendId of selected) {
        const pair1 = `${userId}_${friendId}`;
        const pair2 = `${friendId}_${userId}`;
        if (!friendPairs.has(pair1) && !friendPairs.has(pair2)) {
          friendsData.push([uuidv4(), userId, friendId, now, now]);
          friendPairs.add(pair1);
        }
      }
    }

    if (friendsData.length > 0) {
      for (let i = 0; i < friendsData.length; i += 5000) {
        const chunk = friendsData.slice(i, i + 5000);
        await client.query(format('INSERT INTO user_friends (id, user_id, friend_id, created_at, updated_at) VALUES %L', chunk));
      }
    }
    console.log(`✅ Inserted ${friendsData.length} friendships.`);

    // ─── 3. POSTS ─────────────────────────────────────────────────────────────
    console.log(`📝 Generating Posts...`);
    const postsData = [];
    const postIds = [];
    
    for (const userId of userIds) {
      const numPosts = faker.number.int({ min: 0, max: POSTS_PER_USER_MAX });
      for (let i = 0; i < numPosts; i++) {
        const hasImage = faker.datatype.boolean();
        const id = uuidv4();
        postIds.push(id);
        postsData.push([
          id,
          userId,
          faker.lorem.paragraph(),
          hasImage ? faker.image.urlLoremFlickr() : '',
          '[]', // JSON string for images array
          now,
          now
        ]);
      }
    }

    if (postsData.length > 0) {
      for (let i = 0; i < postsData.length; i += 5000) {
        const chunk = postsData.slice(i, i + 5000);
        await client.query(format('INSERT INTO posts (id, user_id, content, image, images, created_at, updated_at) VALUES %L', chunk));
      }
    }
    console.log(`✅ Inserted ${postIds.length} posts.`);

    // ─── 4. POST COMMENTS & REACTIONS ─────────────────────────────────────────
    console.log(`💬 Generating Comments & Reactions...`);
    const commentsData = [];
    const reactionsData = [];
    const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

    for (const postId of postIds) {
      const numReactions = faker.number.int({ min: 0, max: 10 });
      const reactedUsers = new Set();
      for (let i = 0; i < numReactions; i++) {
        const randomUserId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })];
        if (!reactedUsers.has(randomUserId)) {
          reactionsData.push([
            uuidv4(),
            postId,
            randomUserId,
            faker.helpers.arrayElement(reactionTypes),
            now,
            now
          ]);
          reactedUsers.add(randomUserId);
        }
      }

      const numComments = faker.number.int({ min: 0, max: 3 });
      for (let i = 0; i < numComments; i++) {
        commentsData.push([
          uuidv4(),
          postId,
          userIds[faker.number.int({ min: 0, max: userIds.length - 1 })],
          faker.lorem.sentence(),
          now,
          now
        ]);
      }
    }

    if (reactionsData.length > 0) {
      for (let i = 0; i < reactionsData.length; i += 5000) {
        const chunk = reactionsData.slice(i, i + 5000);
        await client.query(format('INSERT INTO post_reactions (id, post_id, user_id, type, created_at, updated_at) VALUES %L ON CONFLICT DO NOTHING', chunk));
      }
    }
    if (commentsData.length > 0) {
      for (let i = 0; i < commentsData.length; i += 5000) {
        const chunk = commentsData.slice(i, i + 5000);
        await client.query(format('INSERT INTO post_comments (id, post_id, user_id, text, created_at, updated_at) VALUES %L', chunk));
      }
    }
    console.log(`✅ Inserted ${reactionsData.length} reactions and ${commentsData.length} comments.`);

    // ─── 5. GROUPS & MEMBERS ──────────────────────────────────────────────────
    console.log(`👥 Generating Groups...`);
    const groupsData = [];
    const groupIds = [];
    for (let i = 0; i < GROUPS_COUNT; i++) {
      const id = uuidv4();
      groupIds.push({
        id,
        creator_id: userIds[faker.number.int({ min: 0, max: userIds.length - 1 })]
      });
      groupsData.push([
        id,
        faker.company.name() + ' Group',
        groupIds[i].creator_id,
        faker.image.urlLoremFlickr({ category: 'abstract' }),
        now,
        now
      ]);
    }

    if (groupsData.length > 0) {
      await client.query(format('INSERT INTO groups (id, name, creator_id, avatar, created_at, updated_at) VALUES %L', groupsData));
      
      const groupMembersData = [];
      for (const group of groupIds) {
        groupMembersData.push([uuidv4(), group.id, group.creator_id]);
        
        const numMembers = faker.number.int({ min: 2, max: MAX_MEMBERS_PER_GROUP });
        const memberIds = new Set([group.creator_id]);
        while(memberIds.size < numMembers) {
          const randId = userIds[faker.number.int({ min: 0, max: userIds.length - 1 })];
          if(!memberIds.has(randId)) {
            memberIds.add(randId);
            groupMembersData.push([uuidv4(), group.id, randId]);
          }
        }
      }

      for (let i = 0; i < groupMembersData.length; i += 5000) {
        const chunk = groupMembersData.slice(i, i + 5000);
        await client.query(format('INSERT INTO group_members (id, group_id, user_id) VALUES %L ON CONFLICT DO NOTHING', chunk));
      }
      console.log(`✅ Inserted ${groupsData.length} groups with ${groupMembersData.length} members.`);
    }

    // ─── 6. MESSAGES (Private & Group) ────────────────────────────────────────
    console.log(`💌 Generating Messages...`);
    const privateMessagesData = [];
    const groupMessagesData = [];

    for (const [id, user1, user2] of friendsData.slice(0, 5000)) {
      const numMsgs = faker.number.int({ min: 1, max: 10 });
      for (let i = 0; i < numMsgs; i++) {
        const isUser1Sender = faker.datatype.boolean();
        privateMessagesData.push([
          uuidv4(),
          isUser1Sender ? user1 : user2, // sender
          isUser1Sender ? user2 : user1, // receiver
          faker.lorem.sentence(),
          false, // is_encrypted
          now,
          now
        ]);
      }
    }

    for (const group of groupIds) {
      const numMsgs = faker.number.int({ min: 5, max: 20 });
      for (let i = 0; i < numMsgs; i++) {
        groupMessagesData.push([
          uuidv4(),
          group.id,
          userIds[faker.number.int({ min: 0, max: userIds.length - 1 })],
          faker.lorem.sentence(),
          null, // image
          now,
          now
        ]);
      }
    }

    if (privateMessagesData.length > 0) {
      for (let i = 0; i < privateMessagesData.length; i += 5000) {
        const chunk = privateMessagesData.slice(i, i + 5000);
        await client.query(format('INSERT INTO messages (id, sender_id, receiver_id, text, is_encrypted, created_at, updated_at) VALUES %L', chunk));
      }
    }
    if (groupMessagesData.length > 0) {
      for (let i = 0; i < groupMessagesData.length; i += 5000) {
        const chunk = groupMessagesData.slice(i, i + 5000);
        await client.query(format('INSERT INTO group_messages (id, group_id, sender_id, text, image, created_at, updated_at) VALUES %L', chunk));
      }
    }
    console.log(`✅ Inserted ${privateMessagesData.length} private messages & ${groupMessagesData.length} group messages.`);

    await client.query('COMMIT');
    console.log('🎉 Seeding successfully completed!');
    
    console.log(`\n🔑 You can log in using:\nEmail: ${usersData[0][2]}\nPassword: 123456\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
  } finally {
    client.release();
    pool.end();
  }
};

runSeeder();
