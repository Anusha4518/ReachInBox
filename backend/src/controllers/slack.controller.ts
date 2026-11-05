import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';

// In-memory fallback for Slack integration
const inMemorySlack = new Map<string, any>();

/**
 * Initiates the Slack OAuth flow.
 * If live SLACK_CLIENT_ID is not configured in .env, gracefully simulates demo connection and redirects back to dashboard.
 */
export const connectSlack = async (req: Request, res: Response): Promise<void> => {
  const userId = (req.user as any)?.id || 'default_user';

  if (!config.slack.clientId || config.slack.clientId === 'your_slack_client_id_here') {
    // Graceful simulated Slack OAuth flow when live developer credentials are not set in .env
    try {
      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          accessToken: 'xoxb-demo-mock-slack-token',
          teamId: 'T_REACHINBOX_DEMO',
          channelId: '#email-alerts',
          isConnected: true,
        },
        create: {
          userId,
          accessToken: 'xoxb-demo-mock-slack-token',
          teamId: 'T_REACHINBOX_DEMO',
          channelId: '#email-alerts',
          isConnected: true,
        },
      });
    } catch {
      inMemorySlack.set(userId, {
        userId,
        accessToken: 'xoxb-demo-mock-slack-token',
        teamId: 'T_REACHINBOX_DEMO',
        channelId: '#email-alerts',
        isConnected: true,
      });
    }

    inMemorySlack.set(userId, {
      userId,
      accessToken: 'xoxb-demo-mock-slack-token',
      teamId: 'T_REACHINBOX_DEMO',
      channelId: '#email-alerts',
      isConnected: true,
    });

    res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
    return;
  }

  const scopes = 'chat:write,chat:write.public';
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    config.slack.redirectUri
  )}&state=${userId}`;

  res.redirect(slackAuthUrl);
};

export const slackCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query;

  if (error) {
    res.redirect(`${config.frontendUrl}/dashboard?slack_error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${config.frontendUrl}/dashboard?slack_error=missing_code_or_state`);
    return;
  }

  const userId = String(state);

  try {
    // Exchange temporary code for access token
    const tokenResponse = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code: String(code),
        redirect_uri: config.slack.redirectUri,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = tokenResponse.data;

    if (!data.ok) {
      console.error('Slack OAuth exchange failed:', data.error);
      res.redirect(`${config.frontendUrl}/dashboard?slack_error=${encodeURIComponent(data.error)}`);
      return;
    }

    // Persist or update SlackIntegration
    try {
      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          accessToken: data.access_token,
          teamId: data.team?.id,
          channelId: data.incoming_webhook?.channel_id || null,
          isConnected: true,
        },
        create: {
          userId,
          accessToken: data.access_token,
          teamId: data.team?.id,
          channelId: data.incoming_webhook?.channel_id || null,
          isConnected: true,
        },
      });
    } catch {
      inMemorySlack.set(userId, {
        userId,
        accessToken: data.access_token,
        teamId: data.team?.id,
        channelId: data.incoming_webhook?.channel_id || null,
        isConnected: true,
      });
    }

    res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
  } catch (err: any) {
    console.error('Error in Slack OAuth callback:', err);
    res.redirect(`${config.frontendUrl}/dashboard?slack_error=oauth_exchange_failed`);
  }
};

export const getSlackStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let integration: any = null;
    try {
      integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });
    } catch {
      integration = inMemorySlack.get(userId);
    }

    if (!integration) {
      integration = inMemorySlack.get(userId);
    }

    res.status(200).json({
      isConnected: integration?.isConnected ?? false,
      teamId: integration?.teamId ?? null,
      channelId: integration?.channelId ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch Slack status', message: error.message });
  }
};

export const disconnectSlack = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await prisma.slackIntegration.updateMany({
        where: { userId },
        data: { isConnected: false },
      });
    } catch {
      if (inMemorySlack.has(userId)) {
        inMemorySlack.get(userId).isConnected = false;
      }
    }

    if (inMemorySlack.has(userId)) {
      inMemorySlack.get(userId).isConnected = false;
    }

    res.status(200).json({ success: true, message: 'Slack integration disconnected' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to disconnect Slack', message: error.message });
  }
};

/**
 * Dev helper: Connects a simulated or test webhook URL for testing Slack rate-limit alerts.
 */
export const testConnectSlack = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { webhookUrl, channel } = req.body;

    try {
      await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          accessToken: webhookUrl || 'dev-mock-slack-token',
          teamId: 'T_REACHINBOX_DEMO',
          channelId: channel || '#email-alerts',
          isConnected: true,
        },
        create: {
          userId,
          accessToken: webhookUrl || 'dev-mock-slack-token',
          teamId: 'T_REACHINBOX_DEMO',
          channelId: channel || '#email-alerts',
          isConnected: true,
        },
      });
    } catch {
      inMemorySlack.set(userId, {
        userId,
        accessToken: webhookUrl || 'dev-mock-slack-token',
        teamId: 'T_REACHINBOX_DEMO',
        channelId: channel || '#email-alerts',
        isConnected: true,
      });
    }

    inMemorySlack.set(userId, {
      userId,
      accessToken: webhookUrl || 'dev-mock-slack-token',
      teamId: 'T_REACHINBOX_DEMO',
      channelId: channel || '#email-alerts',
      isConnected: true,
    });

    res.status(200).json({ success: true, message: 'Connected Slack workspace (Test Mode)' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to connect test Slack', message: error.message });
  }
};
