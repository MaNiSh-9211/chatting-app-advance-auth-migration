import { Request, Response } from 'express';

import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../services/token.service';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';
import { cacheUserEmail, isEmailCached } from '../config/redis';
import { rateLimitConfig } from '../config/rateLimit.config';
import { handleLoginFailure, resetLoginAttempts } from '../middleware/advancedLimiter';
import {
    RegisterInput,
    LoginInput,
    EmailCheckInput,
} from '../validators/auth.validators';

// Check email availability (super fast with Redis, fallback to DB)
// Check email availability (checks if verified user exists)
export const checkEmailAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body as EmailCheckInput;
        const lowerEmail = email.toLowerCase();

        // We skip Redis check here because we need to know if the user is VERIFIED.
        // Redis only tells us if the email exists, not the status.
        // To allow re-registering unverified emails, we must check the DB.

        const existingUser = await User.findOne({ email: lowerEmail }).lean();

        // Only report as taken if the user is VERIFIED
        if (existingUser && existingUser.isEmailVerified) {
            res.json({ available: false, message: 'Email is already taken' });
            return;
        }

        // If user exists but NOT verified, we treat it as available for re-registration
        res.json({ available: true, message: 'Email is available' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Check if email is verified (for polling)
export const getVerificationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.query;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }

        const user = await User.findOne({ email: (email as string).toLowerCase() }).lean();

        res.json({
            success: true,
            verified: user ? user.isEmailVerified : false
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Register new user
// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, displayName } = req.body as RegisterInput;
        const lowerEmail = email.toLowerCase();

        // CRITICAL: Check if this email has a pending migration from another account
        // If so, prevent creating a new account - migration should handle this
        const userWithPendingMigration = await User.findOne({ 
            newEmailPending: lowerEmail,
            migrationTokenExpires: { $gt: new Date() }
        });
        
        if (userWithPendingMigration) {
            res.status(400).json({ 
                success: false, 
                message: 'This email is pending migration from another account. Please complete the migration process first.',
                code: 'PENDING_MIGRATION',
                requiresMigration: true
            });
            return;
        }

        // Check if user exists
        let user: any = await User.findOne({ email: lowerEmail });

        if (user) {
            // If user exists and is VERIFIED, check provider
            if (user.isEmailVerified) {
                if (user.provider !== 'local') {
                    res.status(400).json({
                        success: false,
                        message: `This email is already associated with a ${user.provider} account.`,
                        code: 'PROVIDER_MISMATCH',
                        provider: user.provider
                    });
                    return;
                }
                res.status(400).json({ success: false, message: 'Email already registered' });
                return;
            }

            // If user exists but UNVERIFIED, we overwrite/update the account
            // This allows the user to "try again" with a new password/details
            user.password = password; // Will be hashed by pre-save hook
            user.displayName = displayName;
            user.provider = 'local';
        } else {
            // Create new user instance
            user = new User({
                email: lowerEmail,
                password,
                displayName,
                provider: 'local',
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        // Set/Update verification fields
        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user.isEmailVerified = false; // Ensure it's false until verified

        await user.save();

        // Cache email in Redis (optional)
        await cacheUserEmail(lowerEmail);

        // Send verification email
        try {
            await sendVerificationEmail(lowerEmail, verificationToken);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user._id,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                isEmailVerified: user.isEmailVerified,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body as LoginInput;
        const lowerEmail = email.toLowerCase();

        // 1. Check Rate Limit Block (Handled by middleware, but check if we need to track this specific user context)

        // Find user with password field (check email OR previousEmail for migrated accounts)
        // IMPORTANT: After migration, new email becomes the current email, so we find by email
        // But we also check previousEmail to support login with old email during grace period
        const user = await User.findOne({
            $or: [{ email: lowerEmail }, { previousEmail: lowerEmail }]
        }).select('+password +refreshTokens +loginCount +lastLogin +bio +avatar +displayName +provider +providerId +previousEmail +migrationExpiry');

        // Handle login with new email during migration (before finalization)
        if (user && user.newEmailPending === lowerEmail) {
            // If both emails are verified, migration should be finalized
            // But if user is logging in with new email, allow it and finalize if needed
            if (user.currentEmailVerified && user.newEmailVerified) {
                // Migration is complete but not finalized yet - finalize it now
                // This allows new email to login directly
                // IMPORTANT: Preserve ALL user data including bio
                const oldEmail = user.email;
                user.previousEmail = oldEmail;
                user.email = user.newEmailPending;
                user.migrationExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
                user.lastMigrationDate = new Date();
                user.isEmailVerified = true;
                // Cleanup migration fields only
                user.newEmailPending = undefined;
                user.currentEmailVerified = undefined;
                user.newEmailVerified = undefined;
                user.currentEmailToken = undefined;
                user.newEmailToken = undefined;
                // bio, displayName, avatar, and all other fields are preserved automatically
                await user.save();
            } else {
                res.status(403).json({
                    success: false,
                    message: 'Please verify both email addresses before logging in with the new email.'
                });
                return;
            }
        }

        // Check migration expiry if logged in with old email
        if (user && user.previousEmail === lowerEmail) {
            if (user.migrationExpiry && user.migrationExpiry < new Date()) {
                res.status(403).json({
                    success: false,
                    message: 'This email is no longer valid for this account. Please use your new email address.'
                });
                return;
            }
        }

        if (!user) {
            // Signal failure to rate limiter
            await handleLoginFailure(req);

            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }

        if (user.provider !== 'local') {
            res.status(400).json({
                success: false,
                message: `Please login with ${user.provider}`,
                code: 'PROVIDER_MISMATCH',
                provider: user.provider
            });
            return;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Signal failure to rate limiter
            const blockUntil = await handleLoginFailure(req);

            if (blockUntil) {
                res.status(429).json({
                    success: false,
                    message: 'Too many failed attempts. Account temporarily blocked.',
                    blockUntil
                });
                return;
            }

            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }

        // 2. Check if Email Verified
        if (!user.isEmailVerified) {
            res.status(403).json({
                success: false,
                message: 'Email not verified. Please verify your email first.',
                code: 'EMAIL_NOT_VERIFIED'
            });
            return;
        }

        // 3. Check Daily Login Limit
        const today = new Date().setHours(0, 0, 0, 0);
        const lastLoginDate = user.lastLogin ? new Date(user.lastLogin).setHours(0, 0, 0, 0) : 0;

        if (lastLoginDate === today) {
            if ((user.loginCount || 0) >= rateLimitConfig.login.maxDailyLogins) {
                res.status(429).json({
                    success: false,
                    message: 'Daily login limit exceeded. Please try again tomorrow.'
                });
                return;
            }
            user.loginCount = (user.loginCount || 0) + 1;
        } else {
            // Reset for new day
            user.loginCount = 1;
        }

        // Success - Reset Rate Limit
        await resetLoginAttempts(req);

        // Update login stats
        user.lastLogin = new Date();

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user);

        // Store refresh token
        user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
        await user.save();

        // CRITICAL: Reload user to ensure ALL fields are fresh (especially after migration)
        // This ensures bio, avatar, displayName, and all other data from previous account is loaded
        const freshUser = await User.findById(user._id).select('+bio +avatar +displayName +provider +providerId +previousEmail +migrationExpiry +createdAt');
        
        if (!freshUser) {
            res.status(500).json({ success: false, message: 'Failed to load user data' });
            return;
        }
        
        // Return ALL user data - this includes all data from previous account after migration
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: freshUser._id,
                email: freshUser.email, // New email after migration
                displayName: freshUser.displayName, // Preserved from previous account
                avatar: freshUser.avatar, // Preserved from previous account (or Gravatar)
                bio: freshUser.bio, // CRITICAL: Bio from previous account is preserved
                isEmailVerified: freshUser.isEmailVerified,
                provider: freshUser.provider, // Preserved from previous account
                previousEmail: freshUser.previousEmail, // Old email (if migrated)
                createdAt: freshUser.createdAt, // Original account creation date
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

// Resend verification email
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const lowerEmail = email.toLowerCase();

        const user = await User.findOne({ email: lowerEmail });

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (user.isEmailVerified) {
            res.status(400).json({ success: false, message: 'Email already verified' });
            return;
        }

        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save();

        try {
            await sendVerificationEmail(lowerEmail, verificationToken);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            res.status(500).json({ success: false, message: 'Failed to send email' });
            return;
        }

        res.json({ success: true, message: 'Verification email sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() },
        }).select('+refreshTokens');

        if (!user) {
            res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
            return;
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        // Generate tokens for auto-login
        const { accessToken, refreshToken } = generateTokenPair(user);
        user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];

        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully',
            user: {
                id: user._id,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                isEmailVerified: user.isEmailVerified,
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ success: false, message: 'Email verification failed' });
    }
};

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const lowerEmail = email.toLowerCase();

        const user = await User.findOne({ email: lowerEmail });

        // Always return success to prevent email enumeration
        if (!user || user.provider !== 'local') {
            res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        try {
            await sendPasswordResetEmail(lowerEmail, resetToken);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
        }

        res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Password reset request failed' });
    }
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, password } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
        }).select('+refreshTokens');

        if (!user) {
            res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
            return;
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.refreshTokens = []; // Invalidate all sessions
        await user.save();

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Password reset failed' });
    }
};

// Refresh access token
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            res.status(401).json({ success: false, message: 'Invalid refresh token' });
            return;
        }

        const user = await User.findById(payload.userId).select('+refreshTokens');
        if (!user) {
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }

        // Check if refresh token exists in user's tokens
        if (!user.refreshTokens?.includes(refreshToken)) {
            res.status(401).json({ success: false, message: 'Refresh token not recognized' });
            return;
        }

        // Generate new tokens
        const tokens = generateTokenPair(user);

        // Replace old refresh token with new one
        user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
        user.refreshTokens.push(tokens.refreshToken);
        await user.save();

        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Token refresh failed' });
    }
};

// Logout
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            const payload = verifyRefreshToken(refreshToken);
            if (payload) {
                const user = await User.findById(payload.userId).select('+refreshTokens');
                if (user) {
                    user.refreshTokens = user.refreshTokens?.filter((t) => t !== refreshToken) || [];
                    await user.save();
                }
            }
        }

        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user as IUser | undefined;

        if (!user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        // CRITICAL: Reload user from database to ensure ALL fields are fresh
        // This is especially important after migration to get all preserved data
        const freshUser = await User.findById(user._id).select('+bio +avatar +displayName +provider +providerId +previousEmail +migrationExpiry +createdAt');
        
        if (!freshUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Return ALL user data including data from previous account after migration
        res.json({
            success: true,
            user: {
                id: freshUser._id,
                email: freshUser.email, // Current email (new email after migration)
                displayName: freshUser.displayName, // Preserved from previous account
                avatar: freshUser.avatar, // Preserved from previous account
                bio: freshUser.bio, // CRITICAL: Bio from previous account is preserved
                isEmailVerified: freshUser.isEmailVerified,
                provider: freshUser.provider, // Preserved from previous account
                previousEmail: freshUser.previousEmail, // Old email (if migrated)
                createdAt: freshUser.createdAt, // Original account creation date
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get user' });
    }
};

// Handle OAuth callback success
export const handleOAuthSuccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user as IUser | undefined;

        if (!user) {
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
            return;
        }

        const { accessToken, refreshToken } = generateTokenPair(user);

        // Store refresh token
        const userDoc = await User.findById(user._id).select('+refreshTokens');
        if (userDoc) {
            userDoc.refreshTokens = [...(userDoc.refreshTokens || []).slice(-4), refreshToken];
            await userDoc.save();
        }

        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
        res.redirect(redirectUrl);
    } catch (error) {
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
};
