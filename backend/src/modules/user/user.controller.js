import User from './user.model.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, bio } = req.body;
    
    let updateData = { name, email, bio };

    // Handle avatar upload
    if (req.file) {
      console.log('⏳ Uploading image to Cloudinary...');
      try {
        const imageUrl = await uploadToCloudinary(req.file.buffer);
        updateData.avatar = imageUrl;
        console.log('✅ Image uploaded:', imageUrl);
      } catch (uploadError) {
        return res.status(500).json({ message: 'Image upload failed' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
        }
      }
    });

  } catch (err) {
    console.error('❌ Profile Update Error:', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};