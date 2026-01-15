import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
    _id: mongoose.Types.ObjectId;
    type: 'personal' | 'group';
    participants: mongoose.Types.ObjectId[]; // User IDs
    name?: string; // Group name (only for group chats)
    description?: string; // Group description
    avatar?: string; // Group avatar URL
    createdBy: mongoose.Types.ObjectId; // User who created the chat
    admins?: mongoose.Types.ObjectId[]; // Group admins (only for group chats)
    lastMessage?: mongoose.Types.ObjectId; // Reference to last message
    lastMessageAt?: Date;
    unreadCount?: Map<string, number>; // Map of userId -> unread count
    isArchived?: Map<string, boolean>; // Map of userId -> archived status
    createdAt: Date;
    updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
    {
        type: {
            type: String,
            enum: ['personal', 'group'],
            required: true,
        },
        participants: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }],
        name: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        avatar: {
            type: String,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        admins: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastMessageAt: Date,
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
        isArchived: {
            type: Map,
            of: Boolean,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
chatSchema.index({ participants: 1, type: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ createdBy: 1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);

