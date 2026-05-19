import express from 'express';
import { 
  sendFriendRequest, 
  respondToFriendRequest, 
  getFriendRequests, 
  getFriends, 
  removeFriend,
  getSuggestions
} from './friend.controller.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/request', sendFriendRequest);
router.put('/request/:requestId', respondToFriendRequest);
router.get('/requests', getFriendRequests);
router.get('/suggestions', getSuggestions);
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

export default router;
