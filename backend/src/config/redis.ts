import { Redis } from 'ioredis';
import { config } from './env.js';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redisConnection.on('error', (err) => {
  // Silent warning so dev can run even if Redis is still starting up
  if ((err as any).code === 'ECONNREFUSED') {
    // Expected before docker/redis is launched
  } else {
    console.error('Redis connection error:', err);
  }
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const pong = await redisConnection.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
};

