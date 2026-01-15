import { Request, Response } from 'express';
import { Chat, IChat } from '../models/Chat';
import { Message, IMessage } from '../models/Message';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth.middleware';

// Get or create personal chat between two users
export const getOrCreatePersonalChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { otherUserId } = req.body;

        if (!otherUserId) {
            res.status(400).json({ success: false, message: 'Other user ID is required' });
            return;
        }

        if (userId.toString() === otherUserId) {
            res.status(400).json({ success: false, message: 'Cannot create chat with yourself' });
            return;
        }

        // Check if personal chat already exists
        let chat = await Chat.findOne({
            type: 'personal',
            participants: { $all: [userId, otherUserId] },
        }).populate('participants', 'displayName customDisplayName avatar customAvatar email status');

        if (!chat) {
            // Create new personal chat
            chat = new Chat({
                type: 'personal',
                participants: [userId, otherUserId],
                createdBy: userId,
            });
            await chat.save();
        }

        // Populate if not already populated
        if (!chat.populated('participants')) {
            await chat.populate('participants', 'displayName customDisplayName avatar customAvatar email status');
        }

        res.json({
            success: true,
            chat: {
                _id: chat._id,
                type: chat.type,
                participants: chat.participants,
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt,
                createdAt: chat.createdAt,
            },
        });
    } catch (error) {
        console.error('Get or create personal chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to get or create chat' });
    }
};

// Create group chat
export const createGroupChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { name, description, participantIds } = req.body;

        if (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            res.status(400).json({ success: false, message: 'Group name and at least one participant required' });
            return;
        }

        // Add creator to participants
        const allParticipants = [userId, ...participantIds];

        const groupChat = new Chat({
            type: 'group',
            name,
            description,
            participants: allParticipants,
            createdBy: userId,
            admins: [userId], // Creator is admin
        });

        await groupChat.save();
        await groupChat.populate('participants', 'displayName customDisplayName avatar customAvatar email status');
        await groupChat.populate('createdBy', 'displayName customDisplayName avatar customAvatar');

        res.json({
            success: true,
            chat: groupChat,
        });
    } catch (error) {
        console.error('Create group chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to create group chat' });
    }
};

// Get user's chats
export const getUserChats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;

        const chats = await Chat.find({
            participants: userId,
        })
            .populate('participants', 'displayName customDisplayName avatar customAvatar email status')
            .populate('lastMessage')
            .populate('createdBy', 'displayName customDisplayName avatar customAvatar')
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .limit(50);

        res.json({
            success: true,
            chats,
        });
    } catch (error) {
        console.error('Get user chats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get chats' });
    }
};

// Get chat by ID
export const getChatById = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId,
        })
            .populate('participants', 'displayName customDisplayName avatar customAvatar email status')
            .populate('createdBy', 'displayName customDisplayName avatar customAvatar')
            .populate('admins', 'displayName customDisplayName avatar customAvatar');

        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat not found' });
            return;
        }

        res.json({
            success: true,
            chat,
        });
    } catch (error) {
        console.error('Get chat by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to get chat' });
    }
};

// Send message
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { chatId, content, type = 'text', attachments, replyTo } = req.body;

        if (!chatId || !content) {
            res.status(400).json({ success: false, message: 'Chat ID and content are required' });
            return;
        }

        // Verify user is participant
        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId,
        });

        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat not found or access denied' });
            return;
        }

        const message = new Message({
            chat: chatId,
            sender: userId,
            content,
            type,
            attachments,
            replyTo,
        });

        await message.save();

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastMessageAt = new Date();
        
        // Increment unread count for all participants except sender
        chat.participants.forEach((participantId) => {
            if (participantId.toString() !== userId.toString()) {
                const currentCount = chat.unreadCount?.get(participantId.toString()) || 0;
                chat.unreadCount?.set(participantId.toString(), currentCount + 1);
            }
        });

        await chat.save();

        await message.populate('sender', 'displayName customDisplayName avatar customAvatar');
        if (replyTo) {
            await message.populate('replyTo');
        }

        res.json({
            success: true,
            message,
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

// Get messages for a chat
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Verify user is participant
        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId,
        });

        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat not found or access denied' });
            return;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const messages = await Message.find({
            chat: chatId,
            isDeleted: false,
        })
            .populate('sender', 'displayName customDisplayName avatar customAvatar')
            .populate('replyTo')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(skip);

        // Mark messages as read
        await Message.updateMany(
            {
                chat: chatId,
                'readBy.user': { $ne: userId },
                isDeleted: false,
            },
            {
                $push: {
                    readBy: {
                        user: userId,
                        readAt: new Date(),
                    },
                },
            }
        );

        // Reset unread count for this user
        chat.unreadCount?.set(userId.toString(), 0);
        await chat.save();

        res.json({
            success: true,
            messages: messages.reverse(), // Reverse to show oldest first
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: await Message.countDocuments({ chat: chatId, isDeleted: false }),
            },
        });
    } catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to get messages' });
    }
};

// Delete message (soft delete)
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);

        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }

        // Only sender can delete
        if (message.sender.toString() !== userId.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
            return;
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        res.json({
            success: true,
            message: 'Message deleted',
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
};

// React to message
export const reactToMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji) {
            res.status(400).json({ success: false, message: 'Emoji is required' });
            return;
        }

        const message = await Message.findById(messageId);

        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }

        if (!message.reactions) {
            message.reactions = new Map();
        }

        const userReactions = message.reactions.get(emoji) || [];
        const userIndex = userReactions.indexOf(userId.toString());

        if (userIndex > -1) {
            // Remove reaction
            userReactions.splice(userIndex, 1);
            if (userReactions.length === 0) {
                message.reactions.delete(emoji);
            } else {
                message.reactions.set(emoji, userReactions);
            }
        } else {
            // Add reaction
            userReactions.push(userId.toString());
            message.reactions.set(emoji, userReactions);
        }

        await message.save();

        res.json({
            success: true,
            reactions: Object.fromEntries(message.reactions),
        });
    } catch (error) {
        console.error('React to message error:', error);
        res.status(500).json({ success: false, message: 'Failed to react to message' });
    }
};

