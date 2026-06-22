import express from 'express';
import { protect } from '../auth/auth.middleware.js';
import {
  createGroup,
  getUserGroups,
  getGroupById,
  getGroupMessages,
  addMembers,
  updateGroup,
  removeMembers,
  leaveGroup,
} from './group.controller.js';

const router = express.Router();
router.use(protect);

router.post('/create', createGroup);
router.get('/my-groups', getUserGroups);
router.get('/:groupId', getGroupById);
router.get('/:groupId/messages', getGroupMessages);
router.post('/add-members', addMembers);
router.put('/:groupId', updateGroup);
router.post('/remove-members', removeMembers);
router.post('/:groupId/leave', leaveGroup);

export default router;
