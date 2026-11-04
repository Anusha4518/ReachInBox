import { redisConnection } from '../config/redis.js';
import { config } from '../config/env.js';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  delayUntilNextHourMs: number;
  hourWindow: string;
}

export class RateLimiterService {
  /**
   * Generates a discrete hour window identifier (e.g., "2026-11-04-22").
   */
  private getHourWindow(date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}-${hh}`;
  }

  /**
   * Calculates milliseconds remaining until the beginning of the next UTC hour window.
   */
  private getMsUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCMinutes(0, 0, 0);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1);
    // Add 1.5 second buffer to guarantee entering the new window
    return Math.max(1000, nextHour.getTime() - now.getTime() + 1500);
  }

  /**
   * Atomically increments the hourly email count for a sender in Redis.
   * If the sender exceeds maxPerHour, returns allowed: false with the delay needed.
   */
  async checkAndIncrementHourlyLimit(
    senderEmail: string,
    maxPerHour: number = config.worker.maxEmailsPerHour
  ): Promise<RateLimitResult> {
    const hourWindow = this.getHourWindow();
    const key = `ratelimit:hourly:${senderEmail}:${hourWindow}`;

    // Atomically increment counter
    const currentCount = await redisConnection.incr(key);

    // If first entry in this window, set TTL of 2 hours
    if (currentCount === 1) {
      await redisConnection.expire(key, 7200);
    }

    if (currentCount > maxPerHour) {
      const delayUntilNextHourMs = this.getMsUntilNextHour();
      return {
        allowed: false,
        currentCount,
        delayUntilNextHourMs,
        hourWindow,
      };
    }

    return {
      allowed: true,
      currentCount,
      delayUntilNextHourMs: 0,
      hourWindow,
    };
  }

  /**
   * Deduplicates Slack alerts: Returns true only ONCE per sender per hour window.
   */
  async shouldSendSlackAlert(senderEmail: string, hourWindow: string): Promise<boolean> {
    const alertKey = `ratelimit:slack_alert:${senderEmail}:${hourWindow}`;
    // SET NX (Not Exists) with 2-hour TTL
    const acquired = await redisConnection.set(alertKey, '1', 'EX', 7200, 'NX');
    return acquired === 'OK';
  }
}

export const rateLimiterService = new RateLimiterService();

