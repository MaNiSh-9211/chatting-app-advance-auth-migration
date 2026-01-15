import { Request, Response } from 'express';
import { User } from '../models/User';
import { FriendRequest, IFriendRequest } from '../models/FriendRequest';

// Send friend request
export const sendFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { toUserId, message } = req.body;

        if (!toUserId) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }

        if (userId.toString() === toUserId) {
            res.status(400).json({ success: false, message: 'Cannot send friend request to yourself' });
            return;
        }

        // Check if users are already friends
        const user = await User.findById(userId);
        const toUser = await User.findById(toUserId);

        if (!user || !toUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (user.friends.includes(toUserId)) {
            res.status(400).json({ success: false, message: 'Already friends' });
            return;
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { from: userId, to: toUserId, status: 'pending' },
                { from: toUserId, to: userId, status: 'pending' },
            ],
        });

        if (existingRequest) {
            res.status(400).json({ success: false, message: 'Friend request already exists' });
            return;
        }

        // Create friend request
        const friendRequest = new FriendRequest({
            from: userId,
            to: toUserId,
            message,
            status: 'pending',
        });

        await friendRequest.save();

        // Update user's friend request arrays
        user.friendRequests.sent.push(toUserId);
        toUser.friendRequests.received.push(userId);
        await user.save();
        await toUser.save();

        await friendRequest.populate('from', 'displayName customDisplayName avatar customAvatar email');
        await friendRequest.populate('to', 'displayName customDisplayName avatar customAvatar email');

        res.json({
            success: true,
            friendRequest,
        });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to send friend request' });
    }
};

// Accept friend request
export const acceptFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { requestId } = req.params;

        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            res.status(404).json({ success: false, message: 'Friend request not found' });
            return;
        }

        if (friendRequest.to.toString() !== userId.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to accept this request' });
            return;
        }

        if (friendRequest.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Friend request is not pending' });
            return;
        }

        // Update request status
        friendRequest.status = 'accepted';
        await friendRequest.save();

        // Add to friends list
        const user = await User.findById(userId);
        const fromUser = await User.findById(friendRequest.from);

        if (!user || !fromUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (!user.friends.includes(friendRequest.from)) {
            user.friends.push(friendRequest.from);
        }
        if (!fromUser.friends.includes(userId)) {
            fromUser.friends.push(userId);
        }

        // Remove from friend request arrays
        user.friendRequests.received = user.friendRequests.received.filter(
            (id) => id.toString() !== friendRequest.from.toString()
        );
        fromUser.friendRequests.sent = fromUser.friendRequests.sent.filter(
            (id) => id.toString() !== userId.toString()
        );

        await user.save();
        await fromUser.save();

        await friendRequest.populate('from', 'displayName customDisplayName avatar customAvatar email');
        await friendRequest.populate('to', 'displayName customDisplayName avatar customAvatar email');

        res.json({
            success: true,
            message: 'Friend request accepted',
            friendRequest,
        });
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to accept friend request' });
    }
};

// Reject friend request
export const rejectFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { requestId } = req.params;

        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            res.status(404).json({ success: false, message: 'Friend request not found' });
            return;
        }

        if (friendRequest.to.toString() !== userId.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
            return;
        }

        friendRequest.status = 'rejected';
        await friendRequest.save();

        // Remove from friend request arrays
        const user = await User.findById(userId);
        const fromUser = await User.findById(friendRequest.from);

        if (user && fromUser) {
            user.friendRequests.received = user.friendRequests.received.filter(
                (id) => id.toString() !== friendRequest.from.toString()
            );
            fromUser.friendRequests.sent = fromUser.friendRequests.sent.filter(
                (id) => id.toString() !== userId.toString()
            );
            await user.save();
            await fromUser.save();
        }

        res.json({
            success: true,
            message: 'Friend request rejected',
        });
    } catch (error) {
        console.error('Reject friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject friend request' });
    }
};

// Cancel friend request
export const cancelFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { requestId } = req.params;

        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            res.status(404).json({ success: false, message: 'Friend request not found' });
            return;
        }

        if (friendRequest.from.toString() !== userId.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
            return;
        }

        friendRequest.status = 'cancelled';
        await friendRequest.save();

        // Remove from friend request arrays
        const user = await User.findById(userId);
        const toUser = await User.findById(friendRequest.to);

        if (user && toUser) {
            user.friendRequests.sent = user.friendRequests.sent.filter(
                (id) => id.toString() !== friendRequest.to.toString()
            );
            toUser.friendRequests.received = toUser.friendRequests.received.filter(
                (id) => id.toString() !== userId.toString()
            );
            await user.save();
            await toUser.save();
        }

        res.json({
            success: true,
            message: 'Friend request cancelled',
        });
    } catch (error) {
        console.error('Cancel friend request error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel friend request' });
    }
};

// Get friend requests
export const getFriendRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { type = 'received' } = req.query; // 'sent' or 'received'

        let query: any = {};
        if (type === 'sent') {
            query = { from: userId, status: 'pending' };
        } else {
            query = { to: userId, status: 'pending' };
        }

        const friendRequests = await FriendRequest.find(query)
            .populate('from', 'displayName customDisplayName avatar customAvatar email status')
            .populate('to', 'displayName customDisplayName avatar customAvatar email status')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            friendRequests,
        });
    } catch (error) {
        console.error('Get friend requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to get friend requests' });
    }
};

// Get friends list
export const getFriends = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;

        const user = await User.findById(userId).populate(
            'friends',
            'displayName customDisplayName avatar customAvatar email status lastSeen'
        );

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.json({
            success: true,
            friends: user.friends,
        });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ success: false, message: 'Failed to get friends' });
    }
};

// Remove friend
export const removeFriend = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { friendId } = req.params;

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Remove from both friends lists
        user.friends = user.friends.filter((id) => id.toString() !== friendId);
        friend.friends = friend.friends.filter((id) => id.toString() !== userId.toString());

        await user.save();
        await friend.save();

        res.json({
            success: true,
            message: 'Friend removed',
        });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove friend' });
    }
};

