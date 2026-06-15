import {
  Post,
  PostReaction,
  PostComment,
  PostCommentReaction,
  PostShare,
  User,
} from '../../models/index.js';
import { Op } from 'sequelize';

const postInclude = [
  { association: 'user', attributes: ['id', 'name', 'avatar'] },
  {
    association: 'comments',
    separate: true,
    include: [
      { association: 'user', attributes: ['id', 'name', 'avatar'] },
      {
        association: 'reactions',
        separate: true,
        include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
      },
    ],
    order: [['createdAt', 'ASC']],
  },
  {
    association: 'reactions',
    separate: true,
    include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
  },
  {
    association: 'originalPost',
    include: [
      { association: 'user', attributes: ['id', 'name', 'avatar'] },
      {
        association: 'reactions',
        separate: true,
        include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
      },
      {
        association: 'comments',
        separate: true,
        include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
      },
    ],
  },
];


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

    const post = await Post.create({
      userId: req.user.id,
      content: content || '',
      image: image || (postImages.length > 0 ? postImages[0] : ''),
      images: postImages,
    });

    const populatedPost = await Post.findByPk(post.id, {
      include: postInclude,
    });

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

    const posts = await Post.findAll({
      include: postInclude,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

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

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Check if user already reacted
    const existingReaction = await PostReaction.findOne({
      where: { postId, userId: req.user.id },
    });

    let action = '';

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Toggle off - remove reaction
        await existingReaction.destroy();
        action = 'unreacted';
      } else {
        // Change reaction type
        existingReaction.type = type;
        await existingReaction.save();
        action = 'changed_reaction';
      }
    } else {
      // Add new reaction
      await PostReaction.create({ postId, userId: req.user.id, type });
      action = 'reacted';
    }

    const populatedPost = await Post.findByPk(postId, { include: postInclude });

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

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    await PostComment.create({ postId, userId: req.user.id, text });

    const populatedPost = await Post.findByPk(postId, { include: postInclude });

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

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    const comment = await PostComment.findByPk(commentId);
    if (!comment || comment.postId !== postId) {
      return res.status(404).json({ status: 'error', message: 'Comment not found' });
    }

    const existingReaction = await PostCommentReaction.findOne({
      where: { commentId, userId: req.user.id },
    });

    let action = '';

    if (existingReaction) {
      if (existingReaction.type === type) {
        await existingReaction.destroy();
        action = 'unreacted';
      } else {
        existingReaction.type = type;
        await existingReaction.save();
        action = 'changed_reaction';
      }
    } else {
      await PostCommentReaction.create({ commentId, userId: req.user.id, type });
      action = 'reacted';
    }

    const populatedPost = await Post.findByPk(postId, { include: postInclude });

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

    const originalPost = await Post.findByPk(postId);
    if (!originalPost) {
      return res.status(404).json({ status: 'error', message: 'Original post not found' });
    }

    // Record share
    await PostShare.create({ postId, userId: req.user.id });

    // Create the repost
    const post = await Post.create({
      userId: req.user.id,
      content: content || '',
      originalPostId: postId,
    });

    const populatedPost = await Post.findByPk(post.id, {
      include: [
        { association: 'user', attributes: ['id', 'name', 'avatar'] },
        {
          association: 'originalPost',
          include: [
            { association: 'user', attributes: ['id', 'name', 'avatar'] },
            {
              association: 'reactions',
              include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
            },
            {
              association: 'comments',
              include: [{ association: 'user', attributes: ['id', 'name', 'avatar'] }],
            },
          ],
        },
      ],
    });

    // Broadcast new post
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);

      // Also broadcast updated original post
      const updatedOriginal = await Post.findByPk(postId, { include: postInclude });
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

    const posts = await Post.findAll({
      where: { userId },
      include: postInclude,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    res.status(200).json({ status: 'success', data: posts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to delete this post' });
    }

    // Delete associated records
    await PostReaction.destroy({ where: { postId } });
    const comments = await PostComment.findAll({ where: { postId }, attributes: ['id'] });
    const commentIds = comments.map((c) => c.id);
    await PostCommentReaction.destroy({ where: { commentId: { [Op.in]: commentIds } } });
    await PostComment.destroy({ where: { postId } });
    await PostShare.destroy({ where: { postId } });
    await post.destroy();

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

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to edit this post' });
    }

    if (content !== undefined) post.content = content;
    if (image !== undefined) post.image = image;
    if (images !== undefined) post.images = images;

    await post.save();

    const populatedPost = await Post.findByPk(postId, { include: postInclude });

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
