import pool from '../../config/pgDatabase.js';

const getPostsQuery = (whereClause = '', orderLimitOffset = '') => `
  SELECT 
    p.id, p.content, p.image, p.images, p.created_at as "createdAt", p.updated_at as "updatedAt", p.user_id as "userId", p.original_post_id as "originalPostId",
    json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as user,
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', c.id, 'text', c.text, 'createdAt', c.created_at, 'updatedAt', c.updated_at, 'userId', c.user_id, 'postId', c.post_id,
          'user', json_build_object('id', cu.id, 'name', cu.name, 'avatar', cu.avatar),
          'reactions', COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', cr.id, 'type', cr.type, 'userId', cr.user_id, 'commentId', cr.comment_id,
                'user', json_build_object('id', cru.id, 'name', cru.name, 'avatar', cru.avatar)
              )
            ) FROM post_comment_reactions cr JOIN users cru ON cr.user_id = cru.id WHERE cr.comment_id = c.id), '[]'::json
          )
        ) ORDER BY c.created_at ASC
      ) FROM post_comments c JOIN users cu ON c.user_id = cu.id WHERE c.post_id = p.id), '[]'::json
    ) as comments,
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', pr.id, 'type', pr.type, 'userId', pr.user_id, 'postId', pr.post_id,
          'user', json_build_object('id', pru.id, 'name', pru.name, 'avatar', pru.avatar)
        )
      ) FROM post_reactions pr JOIN users pru ON pr.user_id = pru.id WHERE pr.post_id = p.id), '[]'::json
    ) as reactions,
    (
      CASE WHEN p.original_post_id IS NOT NULL THEN
        (SELECT json_build_object(
          'id', op.id, 'content', op.content, 'image', op.image, 'images', op.images, 'createdAt', op.created_at, 'updatedAt', op.updated_at,
          'user', json_build_object('id', ou.id, 'name', ou.name, 'avatar', ou.avatar),
          'reactions', COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', opr.id, 'type', opr.type, 'userId', opr.user_id, 'postId', opr.post_id,
                'user', json_build_object('id', opru.id, 'name', opru.name, 'avatar', opru.avatar)
              )
            ) FROM post_reactions opr JOIN users opru ON opr.user_id = opru.id WHERE opr.post_id = op.id), '[]'::json
          ),
          'comments', COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', opc.id, 'text', opc.text, 'createdAt', opc.created_at, 'updatedAt', opc.updated_at, 'userId', opc.user_id, 'postId', opc.post_id,
                'user', json_build_object('id', opcu.id, 'name', opcu.name, 'avatar', opcu.avatar)
              ) ORDER BY opc.created_at ASC
            ) FROM post_comments opc JOIN users opcu ON opc.user_id = opcu.id WHERE opc.post_id = op.id), '[]'::json
          )
        ) FROM posts op JOIN users ou ON op.user_id = ou.id WHERE op.id = p.original_post_id)
      ELSE NULL
      END
    ) as "originalPost"
  FROM posts p
  JOIN users u ON p.user_id = u.id
  ${whereClause}
  ${orderLimitOffset}
`;

const getPopulatedPost = async (postId) => {
  const sql = getPostsQuery('WHERE p.id = $1', '');
  const { rows } = await pool.query(sql, [postId]);
  return rows[0];
};

// Create a new post
export const createPost = async (req, res) => {
  try {
    const { content, image, images } = req.body;

    if (!content && !image && (!images || images.length === 0)) {
      return res.status(400).json({ status: 'error', message: 'Post content or image is required' });
    }

    let postImages = images || [];
    if (image && !postImages.includes(image)) {
      postImages.push(image);
    }

    const { rows } = await pool.query(
      `INSERT INTO posts (user_id, content, image, images, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [
        req.user.id, 
        content || '', 
        image || (postImages.length > 0 ? postImages[0] : ''), 
        JSON.stringify(postImages)
      ]
    );

    const postId = rows[0].id;
    const populatedPost = await getPopulatedPost(postId);

    // Broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);
    }

    res.status(201).json({ status: 'success', data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get feed posts (global feed with pagination)
export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const sql = getPostsQuery('', 'ORDER BY p.created_at DESC LIMIT $1 OFFSET $2');
    const { rows: posts } = await pool.query(sql, [limit, offset]);

    res.status(200).json({ status: 'success', data: posts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Toggle emoji reaction on a post
export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type = 'like' } = req.body || {};

    const { rowCount: postExists } = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postExists === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Check if user already reacted
    const { rows: existingReactions } = await pool.query(
      'SELECT id, type FROM post_reactions WHERE post_id = $1 AND user_id = $2',
      [postId, req.user.id]
    );

    let action = '';

    if (existingReactions.length > 0) {
      const existingReaction = existingReactions[0];
      if (existingReaction.type === type) {
        // Toggle off - remove reaction
        await pool.query('DELETE FROM post_reactions WHERE id = $1', [existingReaction.id]);
        action = 'unreacted';
      } else {
        // Change reaction type
        await pool.query('UPDATE post_reactions SET type = $1, updated_at = NOW() WHERE id = $2', [type, existingReaction.id]);
        action = 'changed_reaction';
      }
    } else {
      // Add new reaction
      await pool.query(
        'INSERT INTO post_reactions (post_id, user_id, type, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        [postId, req.user.id, type]
      );
      action = 'reacted';
    }

    const populatedPost = await getPopulatedPost(postId);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('update_post', populatedPost);
    }

    res.status(200).json({ status: 'success', action, data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Add comment to a post
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ status: 'error', message: 'Comment text is required' });
    }

    const { rowCount: postExists } = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postExists === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    await pool.query(
      'INSERT INTO post_comments (post_id, user_id, text, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
      [postId, req.user.id, text]
    );

    const populatedPost = await getPopulatedPost(postId);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('update_post', populatedPost);
    }

    res.status(200).json({ status: 'success', data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Toggle emoji reaction on a comment
export const toggleReactionComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { type = 'like' } = req.body || {};

    const { rowCount: postExists } = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postExists === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    const { rows: comments } = await pool.query('SELECT id, post_id as "postId" FROM post_comments WHERE id = $1', [commentId]);
    const comment = comments[0];
    if (!comment || comment.postId !== postId) {
      return res.status(404).json({ status: 'error', message: 'Comment not found' });
    }

    const { rows: existingReactions } = await pool.query(
      'SELECT id, type FROM post_comment_reactions WHERE comment_id = $1 AND user_id = $2',
      [commentId, req.user.id]
    );

    let action = '';

    if (existingReactions.length > 0) {
      const existingReaction = existingReactions[0];
      if (existingReaction.type === type) {
        await pool.query('DELETE FROM post_comment_reactions WHERE id = $1', [existingReaction.id]);
        action = 'unreacted';
      } else {
        await pool.query('UPDATE post_comment_reactions SET type = $1, updated_at = NOW() WHERE id = $2', [type, existingReaction.id]);
        action = 'changed_reaction';
      }
    } else {
      await pool.query(
        'INSERT INTO post_comment_reactions (comment_id, user_id, type, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        [commentId, req.user.id, type]
      );
      action = 'reacted';
    }

    const populatedPost = await getPopulatedPost(postId);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('update_post', populatedPost);
    }

    res.status(200).json({ status: 'success', action, data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Share / repost a post
export const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const { rowCount: originalPostExists } = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (originalPostExists === 0) {
      return res.status(404).json({ status: 'error', message: 'Original post not found' });
    }

    // Record share
    await pool.query(
      'INSERT INTO post_shares (post_id, user_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
      [postId, req.user.id]
    );

    // Create the repost
    const { rows: newPosts } = await pool.query(
      `INSERT INTO posts (user_id, content, original_post_id, image, images, created_at, updated_at)
       VALUES ($1, $2, $3, '', '[]', NOW(), NOW())
       RETURNING id`,
      [req.user.id, content || '', postId]
    );

    const newPostId = newPosts[0].id;
    const populatedPost = await getPopulatedPost(newPostId);

    // Broadcast new post
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);

      // Also broadcast updated original post
      const updatedOriginal = await getPopulatedPost(postId);
      io.emit('update_post', updatedOriginal);
    }

    res.status(201).json({ status: 'success', data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get posts by a specific user (for profile)
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const sql = getPostsQuery('WHERE p.user_id = $1', 'ORDER BY p.created_at DESC LIMIT $2 OFFSET $3');
    const { rows: posts } = await pool.query(sql, [userId, limit, offset]);

    res.status(200).json({ status: 'success', data: posts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const { rows: posts } = await pool.query('SELECT user_id as "userId" FROM posts WHERE id = $1', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    if (posts[0].userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to delete this post' });
    }

    // Since we are using raw SQL, we must handle cascading deletes manually if not set up in DB schema.
    // Assuming schema has cascading deletes or we manually delete:
    await pool.query('DELETE FROM post_reactions WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM post_comment_reactions WHERE comment_id IN (SELECT id FROM post_comments WHERE post_id = $1)', [postId]);
    await pool.query('DELETE FROM post_comments WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM post_shares WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

    // Broadcast deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('delete_post', postId);
    }

    res.status(200).json({ status: 'success', message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update/edit a post
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, image, images } = req.body;

    const { rows: posts } = await pool.query('SELECT user_id as "userId" FROM posts WHERE id = $1', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    if (posts[0].userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to edit this post' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (image !== undefined) {
      updates.push(`image = $${paramIndex++}`);
      values.push(image);
    }
    if (images !== undefined) {
      updates.push(`images = $${paramIndex++}`);
      values.push(JSON.stringify(images));
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(postId);
      const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      await pool.query(sql, values);
    }

    const populatedPost = await getPopulatedPost(postId);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('update_post', populatedPost);
    }

    res.status(200).json({ status: 'success', data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
