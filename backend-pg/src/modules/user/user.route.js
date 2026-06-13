import express from 'express';
import { getProfile, updateProfile, registerPublicKey, getUserById } from './user.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { upload } from '../../config/cloudinary.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.get('/profile/:userId', protect, getUserById);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/public-key', protect, registerPublicKey);

export default router;
