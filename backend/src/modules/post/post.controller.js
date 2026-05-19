import Post from './post.model.js';
import User from '../user/user.model.js';

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
      user: req.user._id,
      content,
      image: image || (postImages.length > 0 ? postImages[0] : ""),
      images: postImages
    });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name avatar')
      .exec();

    // Broadcast new post via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);
    }

    res.status(201).json({ status: 'success', data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get feed posts (global feed)
export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate('comments.reactions.user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();

    res.status(200).json({ status: 'success', data: posts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Toggle emoji reaction on a post
export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type = 'like' } = req.body; // type: 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    if (!post.reactions) post.reactions = [];

    const existingReactionIdx = post.reactions.findIndex(
      r => r.user && r.user.toString() === req.user._id.toString()
    );
    let action = '';

    if (existingReactionIdx > -1) {
      const existing = post.reactions[existingReactionIdx];
      if (existing.type === type) {
        // Toggle off if same type
        post.reactions.splice(existingReactionIdx, 1);
        action = 'unreacted';
      } else {
        // Change type
        existing.type = type;
        action = 'changed_reaction';
      }
    } else {
      // Add reaction
      post.reactions.push({ user: req.user._id, type });
      action = 'reacted';
    }

    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate('comments.reactions.user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();

    // Broadcast post update
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      text,
      reactions: []
    });

    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate('comments.reactions.user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();

    // Broadcast post update
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
    const { type = 'like' } = req.body; // type: 'like', 'love', 'haha', 'wow', 'sad', 'angry'

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ status: 'error', message: 'Comment not found' });
    }

    if (!comment.reactions) comment.reactions = [];

    const existingIdx = comment.reactions.findIndex(
      r => r.user && r.user.toString() === req.user._id.toString()
    );
    let action = '';

    if (existingIdx > -1) {
      const existing = comment.reactions[existingIdx];
      if (existing.type === type) {
        // Toggle off
        comment.reactions.splice(existingIdx, 1);
        action = 'unreacted';
      } else {
        // Change type
        existing.type = type;
        action = 'changed_reaction';
      }
    } else {
      // Add reaction
      comment.reactions.push({ user: req.user._id, type });
      action = 'reacted';
    }

    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate('comments.reactions.user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();

    // Broadcast post update
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
    const { content } = req.body; // Optional comment on shared post

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ status: 'error', message: 'Original post not found' });
    }

    originalPost.shares.push(req.user._id);
    await originalPost.save();

    // Create the repost pointing to original post
    const post = await Post.create({
      user: req.user._id,
      content: content || "",
      originalPost: postId
    });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();

    // Broadcast new post via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);
      // Also broadcast the update of original post shares
      const updatedOriginal = await Post.findById(postId)
        .populate('user', 'name avatar')
        .populate('comments.user', 'name avatar')
        .populate('reactions.user', 'name avatar')
        .populate('comments.reactions.user', 'name avatar')
        .populate({
          path: 'originalPost',
          populate: [
            { path: 'user', select: 'name avatar' },
            { path: 'reactions.user', select: 'name avatar' },
            { path: 'comments.user', select: 'name avatar' }
          ]
        })
        .exec();
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
    const skip = (page - 1) * limit;

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate('comments.reactions.user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();
    res.status(200).json({ status: 'success', data: posts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Verify ownership
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(postId);

    // Broadcast post deletion
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Verify ownership
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to edit this post' });
    }

    if (content !== undefined) post.content = content;
    if (image !== undefined) post.image = image;
    if (images !== undefined) post.images = images;

    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate('user', 'name avatar')
      .populate('comments.user', 'name avatar')
      .populate('reactions.user', 'name avatar')
      .populate('comments.reactions.user', 'name avatar')
      .populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'reactions.user', select: 'name avatar' },
          { path: 'comments.user', select: 'name avatar' }
        ]
      })
      .exec();

    // Broadcast post update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('update_post', populatedPost);
    }

    res.status(200).json({ status: 'success', data: populatedPost });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
