import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary কনফিগারেশন
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer কনফিগারেশন (মেমোরি স্টোরেজ ব্যবহার করছি, ফাইল সার্ভারে সেভ হবে না)
const storage = multer.memoryStorage();

// শুধুমাত্র ইমেজ ফাইল ফিল্টার করার জন্য
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // ম্যাক্সিমাম ৫ মেগাবাইট
});

// Cloudinary তে আপলোড করার ফাংশন
export const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'chat_app_avatars' }, // Cloudinary তে ফোল্ডারের নাম
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url); // আপলোড করা ইমেজের URL রিটার্ন করবে
      }
    ).end(fileBuffer);
  });
};