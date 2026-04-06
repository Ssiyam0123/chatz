import express from 'express';
import { getAllUsers, getChatHistory, getConversations } from './chat.controller.js';
import { protect } from '../auth/auth.middleware.js';   

const router = express.Router();
router.use(protect);
router.get('/users', getAllUsers);
router.get('/history/:partnerId', getChatHistory);
router.get('/conversations', getConversations)

export default router;