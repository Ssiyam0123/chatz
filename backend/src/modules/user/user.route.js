import express from 'express';
import { updateProfile, registerPublicKey } from './user.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { upload } from '../../config/cloudinary.js';

const router = express.Router();
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/public-key', protect, registerPublicKey);

export default router;