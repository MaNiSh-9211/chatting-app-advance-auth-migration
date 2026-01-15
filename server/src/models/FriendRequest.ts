import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendRequest extends Document {
    _id: mongoose.Types.ObjectId;
    from: mongoose.Types.ObjectId; // User who sent the request
    to: mongoose.Types.ObjectId; // User who received the request
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    message?: string; // Optional message with friend request
    createdAt: Date;
    updatedAt: Date;
}

const friendRequestSchema = new Schema<IFriendRequest>(
    {
        from: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        to: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'cancelled'],
            default: 'pending',
        },
        message: {
            type: String,
            trim: true,
            maxlength: 200,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure one pending request between two users
friendRequestSchema.index({ from: 1, to: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', friendRequestSchema);

