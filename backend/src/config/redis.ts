import { Redis } from 'ioredis';
import { config } from './env.js';

export const redisConnection = config.redis.url
  ? new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 1000);
      },
    })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 1500,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 1000);
      },
    });

redisConnection.on('error', () => {
  // Silent warning for unstarted local Redis
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const pong = await Promise.race([
      redisConnection.ping(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
    ]);
    return pong === 'PONG';
  } catch {
    return false;
  }
};
