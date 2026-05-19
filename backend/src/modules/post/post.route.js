import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import {
  createPost,
  getPosts,
  toggleLikePost,
  addComment,
  toggleReactionComment,
  sharePost,
  getUserPosts,
  deletePost,
  updatePost
} from './post.controller.js';

const router = express.Router();

router.use(protect);

router.post('/', createPost);
router.get('/', getPosts);
router.get('/user/:userId', getUserPosts);
router.put('/:postId', updatePost);
router.delete('/:postId', deletePost);
router.post('/:postId/like', toggleLikePost);
router.post('/:postId/comment', addComment);
router.post('/:postId/comment/:commentId/react', toggleReactionComment);
router.post('/:postId/share', sharePost);

export default router;
