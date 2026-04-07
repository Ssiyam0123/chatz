import express from 'express';
import { updateProfile } from './user.controller.js';
import { protect } from '../auth/auth.middleware.js';
import { upload } from '../../config/cloudinary.js';

const router = express.Router();
router.put('/profile', protect, upload.single('avatar'), updateProfile);

export default router;