import { z } from 'zod';

// Email validation with comprehensive checks
const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email is too long')
    .refine((email) => {
        // Additional validation for common disposable email domains
        const disposableDomains = ['tempmail.com', 'throwaway.com', '10minutemail.com', 'guerrillamail.com'];
        const domain = email.split('@')[1]?.toLowerCase();
        return !disposableDomains.includes(domain);
    }, 'Disposable email addresses are not allowed')
    .refine((email) => {
        // Check for valid TLD
        const tldRegex = /\.[a-zA-Z]{2,}$/;
        return tldRegex.test(email);
    }, 'Invalid email domain');

// Password validation with strength requirements
const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .refine((password) => /[A-Z]/.test(password), 'Password must contain at least one uppercase letter')
    .refine((password) => /[a-z]/.test(password), 'Password must contain at least one lowercase letter')
    .refine((password) => /[0-9]/.test(password), 'Password must contain at least one number')
    .refine((password) => /[^A-Za-z0-9]/.test(password), 'Password must contain at least one special character');

// Display name validation
const displayNameSchema = z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name is too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, and underscores');

// Registration schema
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema,
});

// Login schema
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

// Email check schema (for quick availability check)
export const emailCheckSchema = z.object({
    email: emailSchema,
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
    email: emailSchema,
});

// Password reset schema
export const passwordResetSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
});

// Email verification schema
export const emailVerifySchema = z.object({
    token: z.string().min(1, 'Verification token is required'),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmailCheckInput = z.infer<typeof emailCheckSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type EmailVerifyInput = z.infer<typeof emailVerifySchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
