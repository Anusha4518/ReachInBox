import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'reachinbox_default_secret_key',

  database: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/reachinbox',
  },

  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },

  ethereal: {
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
  },

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    emailDelayMs: parseInt(process.env.EMAIL_DELAY_MS || '2000', 10),
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
  },
};

