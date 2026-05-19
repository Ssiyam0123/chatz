import express from 'express';
import { upload } from '../../config/cloudinary.js';
import { uploadImage } from './upload.controller.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();
router.post('/image', protect, upload.single('image'), uploadImage);

export default router;
