import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import {
    updateBio,
    updateCustomDisplayName,
    updateCustomAvatar,
    updateProfilePrivacy,
    getUserProfile,
} from '../controllers/profile.controller';

const router = Router();

// Get user profile (optional auth for public profiles)
router.get('/:userId', optionalAuth, getUserProfile);

// All other profile routes require authentication
router.put('/bio', authenticate, updateBio);
router.put('/display-name', authenticate, updateCustomDisplayName);
router.put('/avatar', authenticate, updateCustomAvatar);
router.put('/privacy', authenticate, updateProfilePrivacy);

export default router;

