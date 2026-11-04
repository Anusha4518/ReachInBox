import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { checkDatabaseConnection } from './config/db.js';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Healthcheck endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbConnected = await checkDatabaseConnection();
    res.status(200).json({
      status: 'ok',
      service: 'ReachInbox Email Scheduler API',
      database: dbConnected ? 'connected' : 'disconnected (pending MySQL startup)',
      timestamp: new Date().toISOString(),
    });
  });

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
