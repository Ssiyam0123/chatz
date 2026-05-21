import { User } from '../../models/index.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'avatar', 'bio', 'publicKey', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    console.error('❌ Get Profile Error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, bio } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;

    // Handle avatar upload
    if (req.file) {
      console.log('📤 Uploading image to Cloudinary...');
      try {
        const imageUrl = await uploadToCloudinary(req.file.buffer);
        updateData.avatar = imageUrl;
        console.log('✅ Image uploaded:', imageUrl);
      } catch (uploadError) {
        return res.status(500).json({ message: 'Image upload failed' });
      }
    }

    const [updatedRows] = await User.update(updateData, {
      where: { id: userId },
    });

    if (updatedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'avatar', 'bio'],
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    console.error('❌ Profile Update Error:', err.message);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const registerPublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ message: 'Public key is required' });
    }

    const [updatedRows] = await User.update(
      { publicKey },
      { where: { id: userId } }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { publicKey },
    });
  } catch (err) {
    console.error('❌ Register Public Key Error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
