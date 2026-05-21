import User from './User.js';
import UserFriend from './UserFriend.js';
import Message from './Message.js';
import Group from './Group.js';
import GroupMember from './GroupMember.js';
import GroupMessage from './GroupMessage.js';
import FriendRequest from './FriendRequest.js';
import Post from './Post.js';
import PostReaction from './PostReaction.js';
import PostComment from './PostComment.js';
import PostCommentReaction from './PostCommentReaction.js';
import PostShare from './PostShare.js';
import Story from './Story.js';
import StoryViewer from './StoryViewer.js';

// ─── User Associations ──────────────────────────────────────────────────────

// User friends (self-referential M:N)
User.belongsToMany(User, {
  through: UserFriend,
  as: 'friends',
  foreignKey: 'userId',
  otherKey: 'friendId',
  timestamps: false,
});

UserFriend.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserFriend.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

// User has sent messages
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// User has received messages
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// User created groups
User.hasMany(Group, { foreignKey: 'creatorId', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

// User group memberships (M:N)
User.belongsToMany(Group, {
  through: GroupMember,
  foreignKey: 'userId',
  otherKey: 'groupId',
  as: 'groups',
});

Group.belongsToMany(User, {
  through: GroupMember,
  foreignKey: 'groupId',
  otherKey: 'userId',
  as: 'members',
});

GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

// User sent group messages
User.hasMany(GroupMessage, { foreignKey: 'senderId', as: 'sentGroupMessages' });
GroupMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Group messages belong to group
Group.hasMany(GroupMessage, { foreignKey: 'groupId', as: 'messages' });
GroupMessage.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

// ─── Friend Request Associations ─────────────────────────────────────────────

User.hasMany(FriendRequest, { foreignKey: 'senderId', as: 'sentRequests' });
FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(FriendRequest, { foreignKey: 'receiverId', as: 'receivedRequests' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// ─── Post Associations ───────────────────────────────────────────────────────

User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Post reactions
Post.hasMany(PostReaction, { foreignKey: 'postId', as: 'reactions' });
PostReaction.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(PostReaction, { foreignKey: 'userId', as: 'postReactions' });
PostReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Post comments
Post.hasMany(PostComment, { foreignKey: 'postId', as: 'comments' });
PostComment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(PostComment, { foreignKey: 'userId', as: 'postComments' });
PostComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Comment reactions
PostComment.hasMany(PostCommentReaction, { foreignKey: 'commentId', as: 'reactions' });
PostCommentReaction.belongsTo(PostComment, { foreignKey: 'commentId', as: 'comment' });
User.hasMany(PostCommentReaction, { foreignKey: 'userId', as: 'commentReactions' });
PostCommentReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Post shares
Post.hasMany(PostShare, { foreignKey: 'postId', as: 'shares' });
PostShare.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(PostShare, { foreignKey: 'userId', as: 'postShares' });
PostShare.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Original post (self-referential for reposts)
Post.belongsTo(Post, { foreignKey: 'originalPostId', as: 'originalPost' });
Post.hasMany(Post, { foreignKey: 'originalPostId', as: 'reposts' });

// ─── Story Associations ──────────────────────────────────────────────────────

User.hasMany(Story, { foreignKey: 'userId', as: 'stories' });
Story.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Story viewers
Story.hasMany(StoryViewer, { foreignKey: 'storyId', as: 'viewers' });
StoryViewer.belongsTo(Story, { foreignKey: 'storyId', as: 'story' });
User.hasMany(StoryViewer, { foreignKey: 'userId', as: 'viewedStories' });
StoryViewer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  User,
  UserFriend,
  Message,
  Group,
  GroupMember,
  GroupMessage,
  FriendRequest,
  Post,
  PostReaction,
  PostComment,
  PostCommentReaction,
  PostShare,
  Story,
  StoryViewer,
};
