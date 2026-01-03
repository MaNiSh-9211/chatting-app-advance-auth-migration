import Redis from 'ioredis';
import { config } from './index';

// Redis client - only initialize if enabled
let redis: Redis | null = null;
let isRedisConnected = false;

if (config.redis.enabled) {
    redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        retryStrategy: (times) => {
            if (times > 3) {
                console.log('⚠️ Redis: Max retries reached, disabling Redis features');
                isRedisConnected = false;
                return null; // Stop retrying
            }
            const delay = Math.min(times * 100, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });

    redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        isRedisConnected = true;
    });

    redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        isRedisConnected = false;
    });

    redis.on('close', () => {
        console.log('⚠️ Redis connection closed');
        isRedisConnected = false;
    });

    // Attempt connection
    redis.connect().catch((err) => {
        console.log('⚠️ Redis not available, continuing without cache:', err.message);
        isRedisConnected = false;
    });
} else {
    console.log('ℹ️ Redis is disabled in configuration');
}

// Check if Redis is available
export const isRedisAvailable = (): boolean => {
    return config.redis.enabled && isRedisConnected && redis !== null;
};

// Cache helper functions with fallback
export const cacheSet = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    if (!isRedisAvailable() || !redis) return;
    try {
        if (ttlSeconds) {
            await redis.setex(key, ttlSeconds, value);
        } else {
            await redis.set(key, value);
        }
    } catch {
        // Silently fail - Redis is optional
    }
};

export const cacheGet = async (key: string): Promise<string | null> => {
    if (!isRedisAvailable() || !redis) return null;
    try {
        return await redis.get(key);
    } catch {
        return null;
    }
};

export const cacheDel = async (key: string): Promise<void> => {
    if (!isRedisAvailable() || !redis) return;
    try {
        await redis.del(key);
    } catch {
        // Silently fail
    }
};

// User email cache for super quick existence check
export const cacheUserEmail = async (email: string): Promise<void> => {
    if (!isRedisAvailable() || !redis) return;
    try {
        await redis.sadd('users:emails', email.toLowerCase());
    } catch {
        // Silently fail
    }
};

export const isEmailCached = async (email: string): Promise<boolean | null> => {
    if (!isRedisAvailable() || !redis) return null; // null means "not sure, check DB"
    try {
        return (await redis.sismember('users:emails', email.toLowerCase())) === 1;
    } catch {
        return null;
    }
};

export const removeEmailFromCache = async (email: string): Promise<void> => {
    if (!isRedisAvailable() || !redis) return;
    try {
        await redis.srem('users:emails', email.toLowerCase());
    } catch {
        // Silently fail
    }
};

export { redis };
