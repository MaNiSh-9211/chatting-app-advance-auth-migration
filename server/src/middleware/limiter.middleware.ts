import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis, isRedisAvailable } from '../config/redis';
import { rateLimitConfig } from '../config/rateLimit.config';

// Helper to create store with optional Redis support
const getStore = () => {
    if (isRedisAvailable() && redis) {
        console.log('⚡ Rate Limiting: Using Redis Store');
        return new RedisStore({
            // @ts-ignore - ioredis call signature matches what rate-limit-redis expects
            sendCommand: (...args: string[]) => redis.call(...args),
        });
    }
    console.log('📝 Rate Limiting: Using Memory Store');
    return undefined; // Falls back to MemoryStore
};

// General API Limiter - 1000 requests per minute (very generous for development)
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    skip: (req) => {
        // Skip rate limiting in development if needed, or specific trusted IPs
        return false;
    }
});

// Strict Auth Limiter - Fallback for other auth routes
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20, // Keep strict limit for non-login auth routes (verify, register)
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after an hour.'
    }
});

// Email Existence Check Limiter
// Prevents user enumeration attacks while allowing typical usage
export const emailCheckLimiter = rateLimit({
    windowMs: rateLimitConfig.emailCheck.windowMs,
    limit: rateLimitConfig.emailCheck.limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
    message: {
        success: false,
        message: 'Too many email checks, please slow down.'
    }
});

// Password Reset Limiter
export const passwordResetLimiter = rateLimit({
    windowMs: rateLimitConfig.passwordReset.windowMs,
    limit: rateLimitConfig.passwordReset.limitPerWindow,
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
    message: {
        success: false,
        message: 'Too many password reset requests, please try again after 12 hours.'
    }
});
