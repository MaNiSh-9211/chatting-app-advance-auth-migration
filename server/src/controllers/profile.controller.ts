import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { getUserResponseData } from '../utils/user-helpers';

// Update user bio
export const updateBio = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user as IUser;
        const { bio } = req.body;

        if (bio && bio.length > 500) {
            res.status(400).json({ success: false, message: 'Bio must be 500 characters or less' });
            return;
        }

        // IMPORTANT: Find user by email OR previousEmail (during grace period)
        // This ensures changes from either email reflect in both
        const userDoc = await User.findOne({
            $or: [
                { _id: user._id },
                { email: user.email },
                { previousEmail: user.email }
            ]
        });
        
        if (!userDoc) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Update bio - changes will be visible from both emails during grace period
        userDoc.bio = bio || undefined;
        await userDoc.save();

        res.json({
            success: true,
            message: 'Bio updated successfully',
            user: getUserResponseData(userDoc),
        });
    } catch (error) {
        console.error('Update bio error:', error);
        res.status(500).json({ success: false, message: 'Failed to update bio' });
    }
};

// Update custom display name
export const updateCustomDisplayName = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user as IUser;
        const { customDisplayName } = req.body;

        if (customDisplayName && customDisplayName.length > 50) {
            res.status(400).json({ success: false, message: 'Display name must be 50 characters or less' });
            return;
        }

        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        userDoc.customDisplayName = customDisplayName || undefined;
        await userDoc.save();

        res.json({
            success: true,
            message: 'Display name updated successfully',
            user: getUserResponseData(userDoc),
        });
    } catch (error) {
        console.error('Update custom display name error:', error);
        res.status(500).json({ success: false, message: 'Failed to update display name' });
    }
};

// Update custom avatar (URL)
export const updateCustomAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user as IUser;
        const { customAvatar } = req.body;

        if (customAvatar && !isValidUrl(customAvatar)) {
            res.status(400).json({ success: false, message: 'Invalid avatar URL' });
            return;
        }

        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        userDoc.customAvatar = customAvatar || undefined;
        await userDoc.save();

        res.json({
            success: true,
            message: 'Avatar updated successfully',
            user: getUserResponseData(userDoc),
        });
    } catch (error) {
        console.error('Update custom avatar error:', error);
        res.status(500).json({ success: false, message: 'Failed to update avatar' });
    }
};

// Update profile privacy
export const updateProfilePrivacy = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user as IUser;
        const { isProfilePublic } = req.body;

        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        userDoc.isProfilePublic = isProfilePublic !== false;
        await userDoc.save();

        res.json({
            success: true,
            message: 'Profile privacy updated',
            user: getUserResponseData(userDoc),
        });
    } catch (error) {
        console.error('Update profile privacy error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile privacy' });
    }
};

// Get user profile by ID
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = (req as any).user?._id;

        const user = await User.findById(userId).select('+bio +avatar +displayName +customDisplayName +customAvatar');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Check if profile is public or if it's the user's own profile
        const isOwnProfile = currentUserId && currentUserId.toString() === userId;
        const isFriend = currentUserId && user.friends.includes(currentUserId);

        if (!user.isProfilePublic && !isOwnProfile && !isFriend) {
            res.status(403).json({ success: false, message: 'Profile is private' });
            return;
        }

        res.json({
            success: true,
            user: getUserResponseData(user),
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user profile' });
    }
};

// Helper function to validate URL
const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

