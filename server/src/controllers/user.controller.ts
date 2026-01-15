import { Request, Response } from 'express';
import { User } from '../models/User';
import mongoose from 'mongoose';

// Search user by unique ID
export const searchUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = (req as any).user._id;

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
            return;
        }

        // Don't allow searching for self
        if (userId === currentUserId.toString()) {
            res.status(400).json({
                success: false,
                message: 'Cannot search for yourself'
            });
            return;
        }

        const user = await User.findById(userId).select(
            'displayName customDisplayName avatar customAvatar email status'
        );

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                displayName: user.customDisplayName || user.displayName,
                avatar: user.customAvatar || user.avatar,
                email: user.email,
                status: user.status,
            },
        });
    } catch (error) {
        console.error('Search user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search user'
        });
    }
};

// Search users by email or display name
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req.query;
        const currentUserId = (req as any).user._id;

        if (!query || typeof query !== 'string' || query.length < 2) {
            res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
            return;
        }

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { displayName: { $regex: query, $options: 'i' } },
                { customDisplayName: { $regex: query, $options: 'i' } },
            ],
        })
            .select('displayName customDisplayName avatar customAvatar email status')
            .limit(10);

        res.json({
            success: true,
            users: users.map(u => ({
                _id: u._id,
                displayName: u.customDisplayName || u.displayName,
                avatar: u.customAvatar || u.avatar,
                email: u.email,
                status: u.status,
            })),
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
};

// Get random users for discovery
export const getDiscoverUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentUserId = (req as any).user._id;

        // Get 20 users excluding self (simple approach, for real "random" use aggregate sample if needed)
        // Using sample for better discovery feel
        const users = await User.aggregate([
            { $match: { _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } } },
            { $sample: { size: 20 } },
            {
                $project: {
                    displayName: 1,
                    customDisplayName: 1,
                    avatar: 1,
                    customAvatar: 1,
                    email: 1,
                    status: 1
                }
            }
        ]);

        res.json({
            success: true,
            users: users.map(u => ({
                _id: u._id,
                displayName: u.customDisplayName || u.displayName,
                avatar: u.customAvatar || u.avatar,
                email: u.email,
                status: u.status,
            })),
        });
    } catch (error) {
        console.error('Discover users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get discover users'
        });
    }
};
