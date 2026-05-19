import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import { createStory, getStories, viewStory } from './story.controller.js';

const router = express.Router();

router.use(protect);

router.post('/', createStory);
router.get('/', getStories);
router.post('/:storyId/view', viewStory);

export default router;
