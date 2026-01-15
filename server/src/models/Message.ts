import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    chat: mongoose.Types.ObjectId; // Reference to Chat
    sender: mongoose.Types.ObjectId; // Reference to User
    content: string; // Message text content
    type: 'text' | 'image' | 'file' | 'system'; // Message type
    attachments?: Array<{
        url: string;
        type: 'image' | 'file' | 'video' | 'audio';
        name?: string;
        size?: number;
    }>;
    replyTo?: mongoose.Types.ObjectId; // Reference to another Message (for replies)
    editedAt?: Date; // When message was last edited
    deletedAt?: Date; // When message was deleted (soft delete)
    isDeleted: boolean;
    readBy: Array<{
        user: mongoose.Types.ObjectId;
        readAt: Date;
    }>;
    reactions?: Map<string, string[]>; // Map of emoji -> array of user IDs who reacted
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        chat: {
            type: Schema.Types.ObjectId,
            ref: 'Chat',
            required: true,
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        type: {
            type: String,
            enum: ['text', 'image', 'file', 'system'],
            default: 'text',
        },
        attachments: [{
            url: {
                type: String,
                required: true,
            },
            type: {
                type: String,
                enum: ['image', 'file', 'video', 'audio'],
                required: true,
            },
            name: String,
            size: Number,
        }],
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        editedAt: Date,
        deletedAt: Date,
        isDeleted: {
            type: Boolean,
            default: false,
        },
        readBy: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            readAt: {
                type: Date,
                default: Date.now,
            },
        }],
        reactions: {
            type: Map,
            of: [String], // Array of user IDs
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);

