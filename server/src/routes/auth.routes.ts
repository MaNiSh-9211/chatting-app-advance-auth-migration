import { Router } from 'express';
import passport from '../config/passport';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
    registerSchema,
    loginSchema,
    emailCheckSchema,
    emailVerifySchema,
    passwordResetRequestSchema,
    passwordResetSchema,
    refreshTokenSchema,
} from '../validators/auth.validators';
import {
    register,
    login,
    checkEmailAvailability,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    refreshAccessToken,
    logout,
    getCurrentUser,
    handleOAuthSuccess,
    getVerificationStatus,
} from '../controllers/auth.controller';

import { authLimiter, emailCheckLimiter, passwordResetLimiter } from '../middleware/limiter.middleware';
import { advancedLoginLimiter } from '../middleware/advancedLimiter';

const router = Router();

// Email availability check (super quick with Redis)
// Strict limiting: 30 checks/min to prevent enumeration
router.post('/check-email', emailCheckLimiter, validate(emailCheckSchema), checkEmailAvailability);
router.get('/verification-status', getVerificationStatus);

// Local auth routes
// Auth limiting: 20 attempts/hour
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', advancedLoginLimiter, validate(loginSchema), login);
router.post('/verify-email', authLimiter, validate(emailVerifySchema), verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Password Reset Limiting: 5 attempts/hour
router.post('/forgot-password', passwordResetLimiter, validate(passwordResetRequestSchema), requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, validate(passwordResetSchema), resetPassword);
router.post('/refresh-token', validate(refreshTokenSchema), refreshAccessToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticate, getCurrentUser);

// Google OAuth routes
// Dynamic handler to support login_hint and prompt selection
router.get(
    '/google',
    (req, res, next) => {
        const { login_hint, prompt } = req.query;

        const options: any = {
            scope: ['profile', 'email'],
            session: false,
        };

        if (login_hint) {
            options.loginHint = login_hint as string;
        }

        // Only force select_account if explicitly requested or if it's a first-time login
        // If we have a login_hint and no explicit prompt requested, we skip prompt selection
        if (prompt === 'select_account' || (!login_hint && !prompt)) {
            options.prompt = 'select_account';
        }

        passport.authenticate('google', options)(req, res, next);
    }
);

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    handleOAuthSuccess
);

// GitHub OAuth routes
router.get(
    '/github',
    passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/login' }),
    handleOAuthSuccess
);

export default router;
