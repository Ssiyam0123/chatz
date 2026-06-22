import pool from '../config/pgDatabase.js';

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

const UNSPLASH_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1472214222555-d404758b1c42?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1500627869374-13cd993b1115?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1496181130204-7552cc14ac1a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
];

const runMigration = async () => {
  console.log('🔄 Migrating Database Seed Image URLs to high-reliability sources...');
  try {
    // 1. Migrate user avatars and cover photos
    console.log('👥 Fetching users...');
    const { rows: users } = await pool.query('SELECT id, name, avatar, cover_photo FROM users');
    console.log(`Processing ${users.length} users...`);

    let userUpdatesCount = 0;
    const userPromises = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let newAvatar = user.avatar;
      let newCover = user.cover_photo;
      let needsUpdate = false;

      // Update avatar if it points to i.pravatar.cc or picsum.photos
      if (user.avatar && (user.avatar.includes('pravatar.cc') || user.avatar.includes('picsum.photos'))) {
        const isFemale = femaleFirstNames.some(fn => user.name.startsWith(fn));
        const portraitNum = (i % 99) + 1;
        newAvatar = isFemale
          ? `https://randomuser.me/api/portraits/women/${portraitNum}.jpg`
          : `https://randomuser.me/api/portraits/men/${portraitNum}.jpg`;
        needsUpdate = true;
      }

      // Update cover photo if it points to picsum.photos
      if (user.cover_photo && user.cover_photo.includes('picsum.photos')) {
        const unsplashIndex = i % UNSPLASH_IMAGES.length;
        newCover = UNSPLASH_IMAGES[unsplashIndex];
        needsUpdate = true;
      }

      if (needsUpdate) {
        userPromises.push({
          query: 'UPDATE users SET avatar = $1, cover_photo = $2 WHERE id = $3',
          params: [newAvatar, newCover, user.id]
        });
      }
    }

    console.log(`Processing ${userPromises.length} user updates in parallel chunks...`);
    const chunkSize = 100;
    for (let i = 0; i < userPromises.length; i += chunkSize) {
      const chunk = userPromises.slice(i, i + chunkSize);
      await Promise.all(chunk.map(item => pool.query(item.query, item.params)));
      userUpdatesCount += chunk.length;
    }
    console.log(`✅ Updated ${userUpdatesCount} users.`);

    // 2. Migrate post images
    console.log('📝 Fetching posts...');
    const { rows: posts } = await pool.query('SELECT id, image, images FROM posts WHERE image LIKE \'%picsum.photos%\' OR images::text LIKE \'%picsum.photos%\'');
    console.log(`Processing ${posts.length} posts...`);

    let postUpdatesCount = 0;
    const postPromises = [];
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      let newImage = post.image;
      let newImages = post.images;
      let needsUpdate = false;

      if (post.image && post.image.includes('picsum.photos')) {
        const unsplashIndex = (i + 5) % UNSPLASH_IMAGES.length;
        newImage = UNSPLASH_IMAGES[unsplashIndex];
        needsUpdate = true;
      }

      if (post.images) {
        let parsed = [];
        try {
          parsed = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
        } catch (e) {}

        if (Array.isArray(parsed) && parsed.some(img => img.includes('picsum.photos'))) {
          const updatedImages = parsed.map((img, idx) => {
            if (img.includes('picsum.photos')) {
              const unsplashIndex = (i + idx + 10) % UNSPLASH_IMAGES.length;
              return UNSPLASH_IMAGES[unsplashIndex];
            }
            return img;
          });
          newImages = JSON.stringify(updatedImages);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        postPromises.push({
          query: 'UPDATE posts SET image = $1, images = $2 WHERE id = $3',
          params: [newImage, newImages, post.id]
        });
      }
    }

    console.log(`Processing ${postPromises.length} post updates in parallel chunks...`);
    for (let i = 0; i < postPromises.length; i += chunkSize) {
      const chunk = postPromises.slice(i, i + chunkSize);
      await Promise.all(chunk.map(item => pool.query(item.query, item.params)));
      postUpdatesCount += chunk.length;
    }
    console.log(`✅ Updated ${postUpdatesCount} posts.`);

    // 3. Migrate group avatars
    console.log('👥 Fetching groups...');
    const { rows: groups } = await pool.query('SELECT id, avatar FROM groups');
    console.log(`Processing ${groups.length} groups...`);

    let groupUpdatesCount = 0;
    const groupPromises = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.avatar && (group.avatar.includes('picsum.photos') || group.avatar.includes('pravatar.cc') || group.avatar === '')) {
        const unsplashIndex = (i + 15) % UNSPLASH_IMAGES.length;
        const newAvatar = UNSPLASH_IMAGES[unsplashIndex];
        groupPromises.push({
          query: 'UPDATE groups SET avatar = $1 WHERE id = $2',
          params: [newAvatar, group.id]
        });
      }
    }

    console.log(`Processing ${groupPromises.length} group updates in parallel chunks...`);
    for (let i = 0; i < groupPromises.length; i += chunkSize) {
      const chunk = groupPromises.slice(i, i + chunkSize);
      await Promise.all(chunk.map(item => pool.query(item.query, item.params)));
      groupUpdatesCount += chunk.length;
    }
    console.log(`✅ Updated ${groupUpdatesCount} groups.`);

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
};

runMigration();
