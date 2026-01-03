import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User } from '../models/User';
import { config } from '../config';
import { cacheUserEmail } from '../config/redis';

// Google OAuth Strategy
if (config.google.clientId && config.google.clientSecret) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: config.google.clientId,
                clientSecret: config.google.clientSecret,
                callbackURL: config.google.callbackUrl,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                console.log('Google OAuth callbackURL using:', config.google.callbackUrl);
                try {
                    const email = profile.emails?.[0]?.value?.toLowerCase();

                    if (!email) {
                        return done(new Error('No email found in Google profile'), undefined);
                    }

                    // Check if user exists with this email OR previousEmail (for migrated accounts)
                    let user = await User.findOne({
                        $or: [{ email }, { previousEmail: email }]
                    });

                    if (user) {
                        // Handle migrated accounts: if logging in with previousEmail, find by current email instead
                        if (user.previousEmail === email && user.email !== email) {
                            // User is logging in with old email - check if migration is still valid
                            if (user.migrationExpiry && user.migrationExpiry > new Date()) {
                                // Still in grace period - use existing account
                            } else {
                                // Migration expired - try to find by new email
                                const userByNewEmail = await User.findOne({ email });
                                if (userByNewEmail) {
                                    user = userByNewEmail;
                                }
                            }
                        }
                        
                        // Update provider info and sync OAuth data
                        let modified = false;
                        if (user.provider !== 'google') {
                            user.provider = 'google';
                            user.providerId = profile.id;
                            user.isEmailVerified = true;
                            modified = true;
                        }

                        // Sync OAuth data (avatar and displayName) - especially important for migrated accounts
                        const profilePic = profile.photos?.[0]?.value;
                        if (profilePic && (!user.avatar || user.provider === 'google')) {
                            if (user.avatar !== profilePic) {
                                user.avatar = profilePic;
                                modified = true;
                            }
                        }

                        // Sync display name for Google accounts
                        if (user.provider === 'google' && profile.displayName) {
                            if (user.displayName !== profile.displayName) {
                                user.displayName = profile.displayName;
                                modified = true;
                            }
                        }

                        if (modified) await user.save();
                    } else {
                        // Create new user
                        user = await User.create({
                            email,
                            displayName: profile.displayName || email.split('@')[0],
                            avatar: profile.photos?.[0]?.value,
                            provider: 'google',
                            providerId: profile.id,
                            isEmailVerified: true,
                        });

                        await cacheUserEmail(email);
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );
}

// GitHub OAuth Strategy
if (config.github.clientId && config.github.clientSecret) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: config.github.clientId,
                clientSecret: config.github.clientSecret,
                callbackURL: config.github.callbackUrl,
                scope: ['user:email'],
            },
            async (
                accessToken: string,
                refreshToken: string,
                profile: any,
                done: (error: Error | null, user?: any) => void
            ) => {
                try {
                    const email = profile.emails?.[0]?.value?.toLowerCase();

                    if (!email) {
                        return done(new Error('No email found in GitHub profile'));
                    }

                    let user = await User.findOne({ email });

                    if (user) {
                        let modified = false;
                        if (user.provider !== 'github') {
                            user.provider = 'github';
                            user.providerId = profile.id;
                            user.isEmailVerified = true;
                            modified = true;
                        }

                        // REFINED SYNC LOGIC:
                        // 1. Sync Avatar if it's missing OR if this is a GitHub-first account
                        const profilePic = profile.photos?.[0]?.value;
                        if (profilePic && (!user.avatar || user.provider === 'github')) {
                            if (user.avatar !== profilePic) {
                                user.avatar = profilePic;
                                modified = true;
                            }
                        }

                        // 2. Sync Display Name ONLY if this is a GitHub-first account
                        const githubName = profile.displayName || profile.username;
                        if (user.provider === 'github' && githubName) {
                            if (user.displayName !== githubName) {
                                user.displayName = githubName;
                                modified = true;
                            }
                        }

                        if (modified) await user.save();
                    } else {
                        user = await User.create({
                            email,
                            displayName: profile.displayName || profile.username || email.split('@')[0],
                            avatar: profile.photos?.[0]?.value,
                            provider: 'github',
                            providerId: profile.id,
                            isEmailVerified: true,
                        });

                        await cacheUserEmail(email);
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error);
                }
            }
        )
    );
}

// Serialize/Deserialize for session (used briefly during OAuth redirect)
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
