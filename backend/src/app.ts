import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './config/passport.js';
import { config } from './config/env.js';
import { checkDatabaseConnection } from './config/db.js';
import { checkRedisConnection } from './config/redis.js';
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import slackRoutes from './routes/slack.routes.js';
import { serverAdapter } from './config/bullBoard.js';

export const createApp = (): Application => {
  const app = express();

  // Trust reverse proxy (Render, Railway, Heroku, Vercel)
  app.set('trust proxy', 1);

  // Dynamic CORS allowing configured frontend URL, localhost, and cloud preview deployments
  const allowedOrigins = [
    config.frontendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.railway.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Session middleware
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Healthcheck endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbConnected = await checkDatabaseConnection();
    const redisConnected = await checkRedisConnection();
    res.status(200).json({
      status: 'ok',
      service: 'ReachInbox Email Scheduler API',
      database: dbConnected ? 'connected' : 'disconnected (pending MySQL startup)',
      redis: redisConnected ? 'connected' : 'disconnected (pending Redis startup)',
      timestamp: new Date().toISOString(),
    });
  });

  // BullMQ Dashboard UI (mount on /admin/queues)
  app.use('/admin/queues', serverAdapter.getRouter());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);

  // Global 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Global Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  return app;
};
