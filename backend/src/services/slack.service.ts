import axios from 'axios';
import { prisma } from '../config/db.js';

export class SlackService {
  /**
   * Dispatches a rate limit alert message to the user's connected Slack workspace.
   */
  async notifyRateLimitReached(options: {
    userId: string;
    senderEmail: string;
    limit: number;
    delayUntilNextHourMinutes: number;
  }): Promise<boolean> {
    try {
      // Find user's slack integration
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId: options.userId },
      });

      if (!integration || !integration.isConnected || !integration.accessToken) {
        // User has not connected Slack; fail gracefully without crashing
        return false;
      }

      const messageText = `🚨 *ReachInbox Rate Limit Alert*: Sender \`${options.senderEmail}\` has reached the hourly sending limit of *${options.limit} emails/hr*.\nRemaining scheduled jobs have been automatically delayed by ~${options.delayUntilNextHourMinutes} minutes until the next hourly window.`;

      // Post message to Slack Chat API
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: integration.channelId || '#general',
          text: messageText,
        },
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.ok) {
        console.log(`💬 Slack rate-limit notification sent to team ${integration.teamId}`);
        return true;
      } else {
        console.warn('Slack API warning:', response.data?.error);
        return false;
      }
    } catch (error) {
      console.warn('Could not deliver Slack notification:', error);
      return false;
    }
  }
}

export const slackService = new SlackService();

