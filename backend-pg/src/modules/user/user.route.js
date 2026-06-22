import express from 'express';
import { getProfile, updateProfile, registerPublicKey, getUserById, getUserPublicKey } from './user.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { upload } from '../../config/cloudinary.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.get('/profile/:userId', protect, getUserById);
router.put('/profile', protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), updateProfile);
router.put('/public-key', protect, registerPublicKey);
router.get('/:userId/public-key', protect, getUserPublicKey);

export default router;
