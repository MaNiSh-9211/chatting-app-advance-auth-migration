import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { User } from '../models/User';


export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Access token is required',
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyAccessToken(token);

        if (!payload) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired access token',
            });
            return;
        }

        const user = await User.findById(payload.userId);

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        (req as any).user = user;
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authentication error',
        });
    }
};

export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = verifyAccessToken(token);

            if (payload) {
                const user = await User.findById(payload.userId);
                if (user) {
                    (req as any).user = user;
                }
            }
        }

        next();
    } catch {
        next();
    }
};
