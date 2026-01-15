import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    createProfilePost,
    getUserPosts,
    togglePostLike,
    addComment,
    replyToComment,
    toggleCommentLike,
    deletePost,
} from '../controllers/profile-post.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile post routes
router.post('/', createProfilePost);
router.get('/user/:userId', getUserPosts);
router.post('/:postId/like', togglePostLike);
router.post('/:postId/comment', addComment);
router.post('/:postId/comment/:commentId/reply', replyToComment);
router.post('/:postId/comment/:commentId/like', toggleCommentLike);
router.delete('/:postId', deletePost);

export default router;

