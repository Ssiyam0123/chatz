import pool from '../../config/pgDatabase.js';

// Helper to get populated story
const getPopulatedStory = async (storyId) => {
  const sql = `
    SELECT 
      s.id, s.image, s.text, s.created_at as "createdAt", s.updated_at as "updatedAt",
      json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as user,
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', sv.id, 'story_id', sv.story_id, 'user_id', sv.user_id, 'created_at', sv.created_at,
            'user', json_build_object('id', vu.id, 'name', vu.name, 'avatar', vu.avatar)
          )
        ) FROM story_viewers sv JOIN users vu ON sv.user_id = vu.id WHERE sv.story_id = s.id), '[]'::json
      ) as viewers
    FROM stories s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = $1
  `;
  const { rows } = await pool.query(sql, [storyId]);
  return rows[0];
};

// Create a new story
export const createStory = async (req, res) => {
  try {
    const { image, text } = req.body;

    if (!image) {
      return res.status(400).json({ status: 'error', message: 'Story image is required' });
    }

    const { rows: stories } = await pool.query(
      `INSERT INTO stories (user_id, image, text, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
      [req.user.id, image, text || '']
    );

    const populatedStory = await getPopulatedStory(stories[0].id);

    // Broadcast new story event
    const io = req.app.get('io');
    if (io) {
      io.emit('new_story', populatedStory);
    }

    res.status(201).json({ status: 'success', data: populatedStory });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get stories of current user and their friends (active in the last 24 hours)
export const getStories = async (req, res) => {
  try {
    // We can do this in one complex query to fetch friends + self stories within last 24h
    const sql = `
      SELECT 
        s.id, s.image, s.text, s.created_at as "createdAt", s.updated_at as "updatedAt",
        json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as user,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', sv.id, 'story_id', sv.story_id, 'user_id', sv.user_id, 'created_at', sv.created_at,
              'user', json_build_object('id', vu.id, 'name', vu.name, 'avatar', vu.avatar)
            )
          ) FROM story_viewers sv JOIN users vu ON sv.user_id = vu.id WHERE sv.story_id = s.id), '[]'::json
        ) as viewers
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE (s.user_id = $1 OR s.user_id IN (SELECT friend_id FROM user_friends WHERE user_id = $1))
        AND s.created_at >= NOW() - INTERVAL '24 HOURS'
      ORDER BY s.created_at ASC
    `;

    const { rows: stories } = await pool.query(sql, [req.user.id]);

    // Group stories by user
    const groupedMap = {};

    stories.forEach((story) => {
      const userId = story.user.id;
      if (!groupedMap[userId]) {
        groupedMap[userId] = {
          user: story.user,
          stories: [],
        };
      }
      groupedMap[userId].stories.push({
        _id: story.id,
        image: story.image,
        text: story.text,
        viewers: story.viewers ? story.viewers.map((v) => v.user || v) : [],
        createdAt: story.createdAt,
      });
    });

    const groupedStories = Object.values(groupedMap);

    res.status(200).json({ status: 'success', data: groupedStories });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Record a user viewing a story
export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const { rowCount: storyExists } = await pool.query('SELECT 1 FROM stories WHERE id = $1', [storyId]);
    if (storyExists === 0) {
      return res.status(404).json({ status: 'error', message: 'Story not found' });
    }

    // Check if user already viewed
    const { rowCount: existingView } = await pool.query(
      'SELECT 1 FROM story_viewers WHERE story_id = $1 AND user_id = $2',
      [storyId, req.user.id]
    );

    let storyData;

    if (existingView === 0) {
      await pool.query(
        'INSERT INTO story_viewers (story_id, user_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING',
        [storyId, req.user.id]
      );

      // Broadcast updated story
      const populatedStory = await getPopulatedStory(storyId);
      storyData = populatedStory;

      const io = req.app.get('io');
      if (io) {
        io.emit('new_story', populatedStory);
      }
    } else {
      storyData = await getPopulatedStory(storyId);
    }

    res.status(200).json({ status: 'success', data: storyData });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
