import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  text: { type: String, default: "" },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Seen-by tracking
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hours (86400 seconds)
});

export default mongoose.model('Story', storySchema);
