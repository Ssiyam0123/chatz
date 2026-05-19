import { uploadToCloudinary } from '../../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    console.log('📸 Upload request received');
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No image file provided' });
    }
    console.log(`📂 Processing file: ${req.file.originalname} (${req.file.mimetype})`);
    const imageUrl = await uploadToCloudinary(req.file.buffer);
    console.log('✅ Upload successful:', imageUrl);
    res.status(200).json({ status: 'success', data: { url: imageUrl } });
  } catch (error) {
    console.error('🔥 Upload error:', error);
    res.status(500).json({ message: 'Image upload failed' });
  }
};
