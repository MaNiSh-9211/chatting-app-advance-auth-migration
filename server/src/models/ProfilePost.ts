import mongoose, { Document, Schema } from 'mongoose';

export interface IProfilePost extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId; // User who posted
    image: string; // Image URL
    caption?: string; // Post caption
    likes: mongoose.Types.ObjectId[]; // Array of user IDs who liked
    comments: Array<{
        _id: mongoose.Types.ObjectId;
        user: mongoose.Types.ObjectId;
        content: string;
        likes: mongoose.Types.ObjectId[];
        replies?: Array<{
            _id: mongoose.Types.ObjectId;
            user: mongoose.Types.ObjectId;
            content: string;
            likes: mongoose.Types.ObjectId[];
            createdAt: Date;
        }>;
        createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const profilePostSchema = new Schema<IProfilePost>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        image: {
            type: String,
            required: true,
        },
        caption: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        likes: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        comments: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            content: {
                type: String,
                required: true,
                trim: true,
                maxlength: 500,
            },
            likes: [{
                type: Schema.Types.ObjectId,
                ref: 'User',
            }],
            replies: [{
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                content: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 500,
                },
                likes: [{
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                }],
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            }],
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes
profilePostSchema.index({ user: 1, createdAt: -1 });
profilePostSchema.index({ createdAt: -1 });

export const ProfilePost = mongoose.model<IProfilePost>('ProfilePost', profilePostSchema);

