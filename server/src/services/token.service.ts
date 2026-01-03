import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { IUser } from '../models/User';

interface TokenPayload {
    userId: string;
    email: string;
    type: 'access' | 'refresh';
}

// Parse expiration time string to seconds
const parseExpiry = (expiry: string): number => {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 900;
    }
};

export const generateAccessToken = (user: IUser): string => {
    const payload: TokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        type: 'access',
    };

    const options: SignOptions = {
        expiresIn: parseExpiry(config.jwt.accessExpiresIn),
    };

    return jwt.sign(payload, config.jwt.accessSecret, options);
};

export const generateRefreshToken = (user: IUser): string => {
    const payload: TokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        type: 'refresh',
    };

    const options: SignOptions = {
        expiresIn: parseExpiry(config.jwt.refreshExpiresIn),
    };

    return jwt.sign(payload, config.jwt.refreshSecret, options);
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
        if (decoded.type !== 'access') return null;
        return decoded;
    } catch {
        return null;
    }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
        if (decoded.type !== 'refresh') return null;
        return decoded;
    } catch {
        return null;
    }
};

export const generateTokenPair = (user: IUser): { accessToken: string; refreshToken: string } => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
    };
};
