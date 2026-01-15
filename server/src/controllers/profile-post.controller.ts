import { Request, Response } from 'express';
import { ProfilePost, IProfilePost } from '../models/ProfilePost';
import { User } from '../models/User';

// Create profile post
export const createProfilePost = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { image, caption } = req.body;

        if (!image) {
            res.status(400).json({ success: false, message: 'Image URL is required' });
            return;
        }

        if (caption && caption.length > 1000) {
            res.status(400).json({ success: false, message: 'Caption must be 1000 characters or less' });
            return;
        }

        const post = new ProfilePost({
            user: userId,
            image,
            caption: caption || undefined,
        });

        await post.save();
        await post.populate('user', 'displayName customDisplayName avatar customAvatar email');

        res.json({
            success: true,
            post,
        });
    } catch (error) {
        console.error('Create profile post error:', error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
};

// Get user's profile posts
export const getUserPosts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Check if profile is public
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const currentUserId = (req as any).user?._id;
        const isOwnProfile = currentUserId && currentUserId.toString() === userId;
        const isFriend = currentUserId && targetUser.friends.includes(currentUserId);

        if (!targetUser.isProfilePublic && !isOwnProfile && !isFriend) {
            res.status(403).json({ success: false, message: 'Profile is private' });
            return;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const posts = await ProfilePost.find({ user: userId })
            .populate('user', 'displayName customDisplayName avatar customAvatar email')
            .populate('likes', 'displayName customDisplayName avatar customAvatar')
            .populate('comments.user', 'displayName customDisplayName avatar customAvatar')
            .populate('comments.replies.user', 'displayName customDisplayName avatar customAvatar')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(skip);

        res.json({
            success: true,
            posts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: await ProfilePost.countDocuments({ user: userId }),
            },
        });
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ success: false, message: 'Failed to get posts' });
    }
};

// Like/Unlike post
export const togglePostLike = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { postId } = req.params;

        const post = await ProfilePost.findById(postId);

        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }

        const likeIndex = post.likes.findIndex((id) => id.toString() === userId.toString());

        if (likeIndex > -1) {
            // Unlike
            post.likes.splice(likeIndex, 1);
        } else {
            // Like
            post.likes.push(userId);
        }

        await post.save();
        await post.populate('likes', 'displayName customDisplayName avatar customAvatar');

        res.json({
            success: true,
            likes: post.likes,
            isLiked: !post.likes.find((id) => id.toString() === userId.toString()) ? false : true,
        });
    } catch (error) {
        console.error('Toggle post like error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle like' });
    }
};

// Add comment to post
export const addComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { postId } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            res.status(400).json({ success: false, message: 'Comment content is required' });
            return;
        }

        if (content.length > 500) {
            res.status(400).json({ success: false, message: 'Comment must be 500 characters or less' });
            return;
        }

        const post = await ProfilePost.findById(postId);

        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }

        post.comments.push({
            user: userId,
            content: content.trim(),
            likes: [],
            replies: [],
        } as any);

        await post.save();
        await post.populate('comments.user', 'displayName customDisplayName avatar customAvatar');
        const newComment = post.comments[post.comments.length - 1];

        res.json({
            success: true,
            comment: newComment,
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

// Reply to comment
export const replyToComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { postId, commentId } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            res.status(400).json({ success: false, message: 'Reply content is required' });
            return;
        }

        if (content.length > 500) {
            res.status(400).json({ success: false, message: 'Reply must be 500 characters or less' });
            return;
        }

        const post = await ProfilePost.findById(postId);

        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            res.status(404).json({ success: false, message: 'Comment not found' });
            return;
        }

        comment.replies.push({
            user: userId,
            content: content.trim(),
            likes: [],
        } as any);

        await post.save();
        await post.populate('comments.replies.user', 'displayName customDisplayName avatar customAvatar');
        const updatedComment = post.comments.id(commentId);

        res.json({
            success: true,
            comment: updatedComment,
        });
    } catch (error) {
        console.error('Reply to comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to reply to comment' });
    }
};

// Like/Unlike comment
export const toggleCommentLike = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { postId, commentId } = req.params;

        const post = await ProfilePost.findById(postId);

        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            res.status(404).json({ success: false, message: 'Comment not found' });
            return;
        }

        const likeIndex = comment.likes.findIndex((id) => id.toString() === userId.toString());

        if (likeIndex > -1) {
            comment.likes.splice(likeIndex, 1);
        } else {
            comment.likes.push(userId);
        }

        await post.save();

        res.json({
            success: true,
            likes: comment.likes,
            isLiked: comment.likes.find((id) => id.toString() === userId.toString()) ? true : false,
        });
    } catch (error) {
        console.error('Toggle comment like error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle comment like' });
    }
};

// Delete post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { postId } = req.params;

        const post = await ProfilePost.findById(postId);

        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }

        if (post.user.toString() !== userId.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
            return;
        }

        await ProfilePost.findByIdAndDelete(postId);

        res.json({
            success: true,
            message: 'Post deleted',
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

