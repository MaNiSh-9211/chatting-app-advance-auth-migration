import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import { config } from './config';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import migrationRoutes from './routes/migration.routes';
import profileRoutes from './routes/profile.routes';
import { apiLimiter } from './middleware/limiter.middleware';

const app = express();

// CORS configuration - MUST be before other middleware
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow all origins in development or if no origin (e.g., Postman, mobile apps)
            if (config.nodeEnv === 'development' || !origin) {
                return callback(null, true);
            }
            const allowedOrigins = [
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:5174',
                'http://127.0.0.1:5174',
                'http://localhost:3000',
                config.clientUrl
            ];
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn(`Blocked by CORS: Origin ${origin} not in allowed list:`, allowedOrigins);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    })
);

// Security middleware - configured to work with CORS
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
    })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/auth/migrate', migrationRoutes);
app.use('/api/auth/profile', profileRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
});

// Start server
const startServer = async (): Promise<void> => {
    try {
        await connectDatabase();

        app.listen(config.port, () => {
            console.log(`🚀 Server running on http://localhost:${config.port}`);
            console.log(`📝 Environment: ${config.nodeEnv}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
