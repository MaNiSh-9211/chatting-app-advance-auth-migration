import { IUser } from '../models/User';

/**
 * Get the effective display name for a user
 * Returns customDisplayName if set, otherwise falls back to displayName
 */
export const getEffectiveDisplayName = (user: IUser): string => {
    return user.customDisplayName || user.displayName;
};

/**
 * Get the effective avatar for a user
 * Returns customAvatar if set, otherwise falls back to avatar
 */
export const getEffectiveAvatar = (user: IUser): string | undefined => {
    return user.customAvatar || user.avatar;
};

/**
 * Get user data for API responses (includes effective display name and avatar)
 */
export const getUserResponseData = (user: IUser) => {
    return {
        id: user._id,
        email: user.email,
        displayName: getEffectiveDisplayName(user),
        avatar: getEffectiveAvatar(user),
        customDisplayName: user.customDisplayName,
        customAvatar: user.customAvatar,
        bio: user.bio,
        status: user.status || 'offline',
        isEmailVerified: user.isEmailVerified,
        provider: user.provider,
        isProfilePublic: user.isProfilePublic !== false, // Default to true
    };
};

