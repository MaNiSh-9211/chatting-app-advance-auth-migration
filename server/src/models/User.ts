import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password?: string;
    displayName: string;
    avatar?: string;
    bio?: string; // User bio/passage
    isEmailVerified: boolean;
    // Chat App Features
    customDisplayName?: string; // Override OAuth display name
    customAvatar?: string; // Override OAuth avatar (uploaded image)
    friends: mongoose.Types.ObjectId[]; // Array of friend user IDs
    friendRequests: {
        sent: mongoose.Types.ObjectId[]; // Friend requests sent by this user
        received: mongoose.Types.ObjectId[]; // Friend requests received by this user
    };
    status: 'online' | 'offline' | 'away' | 'busy'; // User status
    lastSeen?: Date; // Last seen timestamp
    isProfilePublic: boolean; // Whether profile is public or private
    loginCount?: number;
    lastLogin?: Date;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    provider: 'local' | 'google' | 'github';
    providerId?: string;
    refreshTokens: string[];
    // Account Migration fields
    previousEmail?: string;
    migrationExpiry?: Date;
    migrationToken?: string;
    migrationTokenExpires?: Date;
    newEmailPending?: string;
    lastMigrationDate?: Date;
    currentEmailVerified?: boolean; // Track if current email is verified for migration
    newEmailVerified?: boolean; // Track if new email is verified for migration
    currentEmailToken?: string; // Token for current email verification
    newEmailToken?: string; // Token for new email verification
    lastMigrationEmailSent?: Date; // Track when migration emails were last sent (for cooldown)
    migrationHistory?: Array<{
        fromEmail: string;
        toEmail: string;
        status: 'success' | 'failed' | 'pending' | 'reverted';
        initiatedAt: Date;
        completedAt?: Date;
        revertedAt?: Date;
        currentEmailVerified?: boolean; // Track if current email was verified
        newEmailVerified?: boolean; // Track if new email was verified
        pendingFrom?: 'current' | 'new' | 'both'; // Which email(s) are pending verification
    }>; // Track all migration attempts
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        // Store previous email during 5-day migration window
        previousEmail: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        },
        migrationExpiry: Date, // When the dual-login window expires
        migrationToken: String,
        migrationTokenExpires: Date,
        newEmailPending: {
            type: String,
            lowercase: true,
            trim: true,
        },
        lastMigrationDate: Date, // For 10-day cooldown
        currentEmailVerified: Boolean, // Track if current email is verified for migration
        newEmailVerified: Boolean, // Track if new email is verified for migration
        currentEmailToken: String, // Token for current email verification
        newEmailToken: String, // Token for new email verification
        lastMigrationEmailSent: Date, // Track when migration emails were last sent (for cooldown)
        migrationHistory: [{
            fromEmail: String,
            toEmail: String,
            status: { type: String, enum: ['success', 'failed', 'pending', 'reverted'], default: 'pending' },
            initiatedAt: Date,
            completedAt: { type: Date, required: false },
            revertedAt: { type: Date, required: false },
            currentEmailVerified: { type: Boolean, required: false },
            newEmailVerified: { type: Boolean, required: false },
            pendingFrom: { type: String, enum: ['current', 'new', 'both'], required: false }
        }], // Track all migration attempts
        password: {
            type: String,
            minlength: 8,
            select: false,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        avatar: {
            type: String,
        },
        bio: {
            type: String,
            maxlength: 500,
            trim: true,
        },
        // Chat App Features
        customDisplayName: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        customAvatar: {
            type: String, // URL to uploaded image
        },
        friends: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        friendRequests: {
            sent: [{
                type: Schema.Types.ObjectId,
                ref: 'User',
            }],
            received: [{
                type: Schema.Types.ObjectId,
                ref: 'User',
            }],
        },
        status: {
            type: String,
            enum: ['online', 'offline', 'away', 'busy'],
            default: 'offline',
        },
        lastSeen: Date,
        isProfilePublic: {
            type: Boolean,
            default: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        loginCount: { type: Number, default: 0 },
        lastLogin: Date,
        emailVerificationToken: String,
        emailVerificationExpires: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        provider: {
            type: String,
            enum: ['local', 'google', 'github'],
            default: 'local',
        },
        providerId: String,
        refreshTokens: {
            type: [String],
            default: [],
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
