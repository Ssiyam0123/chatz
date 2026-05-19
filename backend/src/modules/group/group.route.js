import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import {
  createGroup,
  getUserGroups,
  getGroupById,
  getGroupMessages,
  addMembers,
} from './group.controller.js';

const router = express.Router();
router.use(protect);

router.post('/create', createGroup);
router.get('/my-groups', getUserGroups);
router.get('/:groupId', getGroupById);           // NEW: single group details
router.get('/:groupId/messages', getGroupMessages);
router.post('/add-members', addMembers);

export default router;
