import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { searchUserById, searchUsers, getDiscoverUsers } from '../controllers/user.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Search user by unique ID
router.get('/id/:userId', searchUserById);

// Discover users (random)
router.get('/discover', getDiscoverUsers);

// Search users by email or display name
router.get('/search', searchUsers);

export default router;
