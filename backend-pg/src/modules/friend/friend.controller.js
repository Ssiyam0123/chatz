import pool from '../../config/pgDatabase.js';

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    // Check receiver exists
    const { rowCount: receiverExists } = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [receiverId]
    );
    if (receiverExists === 0) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    // Check if request already exists
    const { rows: existingRequests } = await pool.query(
      `SELECT status, sender_id as "senderId" FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, receiverId]
    );

    if (existingRequests.length > 0) {
      const existingRequest = existingRequests[0];
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends' });
      }
      if (existingRequest.status === 'pending') {
        if (existingRequest.senderId === senderId) {
          return res.status(400).json({ message: 'Friend request is already pending' });
        } else {
          return res.status(400).json({ message: 'A pending friend request exists from this user. Please accept it.' });
        }
      }
    }

    // Create friend request
    const { rows: newRequests } = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at)
       VALUES ($1, $2, 'pending', NOW(), NOW())
       RETURNING id, sender_id as "senderId", receiver_id as "receiverId", status, created_at as "createdAt", updated_at as "updatedAt"`,
      [senderId, receiverId]
    );
    
    const request = newRequests[0];

    // Fetch with user details
    const { rows: populatedRequests } = await pool.query(
      `SELECT 
        fr.id, fr.sender_id as "senderId", fr.receiver_id as "receiverId", fr.status, fr.created_at as "createdAt", fr.updated_at as "updatedAt",
        json_build_object('id', s.id, 'name', s.name, 'avatar', s.avatar, 'bio', s.bio, 'publicKey', s.public_key) as sender,
        json_build_object('id', r.id, 'name', r.name, 'avatar', r.avatar, 'bio', r.bio, 'publicKey', r.public_key) as receiver
       FROM friend_requests fr
       JOIN users s ON fr.sender_id = s.id
       JOIN users r ON fr.receiver_id = r.id
       WHERE fr.id = $1`,
      [request.id]
    );

    const populatedRequest = populatedRequests[0];

    res.status(201).json({
      status: 'success',
      data: populatedRequest,
    });

    // Emit socket event to receiver
    const io = req.app.get('io');
    if (io) {
      const { userSockets } = await import('../socket/socket.handler.js');
      console.log(`📡 Emitting friend_request_received to receiverId=${receiverId}`);
      const receiverSockets = userSockets.get(String(receiverId));
      if (receiverSockets) {
        for (const socketId of receiverSockets) {
          io.to(socketId).emit('friend_request_received', populatedRequest);
        }
      }
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Accept / Decline request
export const respondToFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;
    const { status } = req.body; // 'accepted' | 'declined'

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status response' });
    }

    const { rows: requests } = await pool.query(
      'SELECT id, sender_id as "senderId", receiver_id as "receiverId", status FROM friend_requests WHERE id = $1',
      [requestId]
    );

    const request = requests[0];
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Only the receiver of the request can respond
    if (request.receiverId !== userId) {
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Friend request has already been ${request.status}` });
    }

    if (status === 'accepted') {
      await pool.query(
        'UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, requestId]
      );
      
      // Add bidirectional friendship records
      await pool.query(
        `INSERT INTO user_friends (user_id, friend_id, created_at, updated_at) 
         VALUES ($1, $2, NOW(), NOW()), ($2, $1, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [request.senderId, request.receiverId]
      );
    } else {
      // Delete declined request so users can request again
      await pool.query('DELETE FROM friend_requests WHERE id = $1', [requestId]);
    }
    
    // Fetch updated request with populated sender and receiver
    const { rows: updatedRequests } = await pool.query(
      `SELECT 
        fr.id, fr.sender_id as "senderId", fr.receiver_id as "receiverId", fr.status, fr.created_at as "createdAt", fr.updated_at as "updatedAt",
        json_build_object('id', s.id, 'name', s.name, 'avatar', s.avatar, 'bio', s.bio, 'publicKey', s.public_key) as sender,
        json_build_object('id', r.id, 'name', r.name, 'avatar', r.avatar, 'bio', r.bio, 'publicKey', r.public_key) as receiver
       FROM friend_requests fr
       JOIN users s ON fr.sender_id = s.id
       JOIN users r ON fr.receiver_id = r.id
       WHERE fr.id = $1`,
      [requestId]
    );
    const updatedRequest = updatedRequests[0] || { ...request, status };

    res.status(200).json({
      status: 'success',
      message: `Friend request ${status}`,
      data: updatedRequest,
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const { userSockets } = await import('../socket/socket.handler.js');
      console.log(`📡 Emitting friend_request_responded status=${status} to sender=${updatedRequest.senderId} and receiver=${userId}`);
      // Notify the sender of the request
      const senderSockets = userSockets.get(String(updatedRequest.senderId));
      if (senderSockets) {
        for (const socketId of senderSockets) {
          io.to(socketId).emit('friend_request_responded', {
            requestId: updatedRequest.id,
            status,
            request: updatedRequest
          });
        }
      }
      // Notify other active sockets of the responder (receiver)
      const receiverSockets = userSockets.get(String(userId));
      if (receiverSockets) {
        for (const socketId of receiverSockets) {
          io.to(socketId).emit('friend_request_responded', {
            requestId: updatedRequest.id,
            status,
            request: updatedRequest
          });
        }
      }
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get pending request list
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows: requests } = await pool.query(
      `SELECT 
        fr.id, fr.sender_id as "senderId", fr.receiver_id as "receiverId", fr.status, fr.created_at as "createdAt", fr.updated_at as "updatedAt",
        json_build_object('id', s.id, 'name', s.name, 'email', s.email, 'avatar', s.avatar, 'bio', s.bio, 'publicKey', s.public_key) as sender,
        json_build_object('id', r.id, 'name', r.name, 'email', r.email, 'avatar', r.avatar, 'bio', r.bio, 'publicKey', r.public_key) as receiver
       FROM friend_requests fr
       JOIN users s ON fr.sender_id = s.id
       JOIN users r ON fr.receiver_id = r.id
       WHERE (fr.receiver_id = $1 OR fr.sender_id = $1) AND fr.status = 'pending'`,
      [userId]
    );

    res.status(200).json({
      status: 'success',
      data: requests,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get user's active friends
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { rows: friends } = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.avatar, u.bio, u.public_key as "publicKey"
       FROM user_friends uf
       JOIN users u ON uf.friend_id = u.id
       WHERE uf.user_id = $1
       ORDER BY u.name ASC`,
      [userId]
    );

    res.status(200).json({
      status: 'success',
      data: friends,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Remove friend / Unfriend
export const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    // Remove bidirectional friendship records
    await pool.query(
      `DELETE FROM user_friends 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    // Remove any friend request records
    await pool.query(
      `DELETE FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [userId, friendId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Unfriended successfully',
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const { userSockets } = await import('../socket/socket.handler.js');
      console.log(`📡 Emitting friend_removed from userId=${userId} to friendId=${friendId}`);
      // Notify the other user
      const friendSockets = userSockets.get(String(friendId));
      if (friendSockets) {
        for (const socketId of friendSockets) {
          io.to(socketId).emit('friend_removed', { friendId: userId });
        }
      }
      // Notify other active sockets of the remover
      const userSocketsSet = userSockets.get(String(userId));
      if (userSocketsSet) {
        for (const socketId of userSocketsSet) {
          io.to(socketId).emit('friend_removed', { friendId });
        }
      }
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get "People You May Know" suggestions
export const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '15');
    const offset = (page - 1) * limit;

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(u.id) as count 
       FROM users u
       LEFT JOIN user_friends uf ON u.id = uf.friend_id AND uf.user_id = $1
       LEFT JOIN friend_requests fr ON (u.id = fr.sender_id AND fr.receiver_id = $1) OR (u.id = fr.receiver_id AND fr.sender_id = $1)
       WHERE u.id != $1 
         AND uf.friend_id IS NULL
         AND fr.id IS NULL`,
      [userId]
    );
    const count = parseInt(countRows[0].count);

    const { rows: suggestions } = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.bio, u.public_key as "publicKey" 
       FROM users u
       LEFT JOIN user_friends uf ON u.id = uf.friend_id AND uf.user_id = $1
       LEFT JOIN friend_requests fr ON (u.id = fr.sender_id AND fr.receiver_id = $1) OR (u.id = fr.receiver_id AND fr.sender_id = $1)
       WHERE u.id != $1 
         AND uf.friend_id IS NULL
         AND fr.id IS NULL
       ORDER BY u.id DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.status(200).json({
      status: 'success',
      data: suggestions,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
