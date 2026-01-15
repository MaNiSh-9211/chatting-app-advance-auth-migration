import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriendRequests,
    getFriends,
    removeFriend,
} from '../controllers/friend.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Friend request routes
router.post('/request', sendFriendRequest);
router.post('/request/:requestId/accept', acceptFriendRequest);
router.post('/request/:requestId/reject', rejectFriendRequest);
router.post('/request/:requestId/cancel', cancelFriendRequest);
router.get('/requests', getFriendRequests);

// Friends routes
router.get('/list', getFriends);
router.delete('/:friendId', removeFriend);

export default router;

