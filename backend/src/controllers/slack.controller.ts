import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';

export const connectSlack = (req: Request, res: Response): void => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!config.slack.clientId || config.slack.clientId === 'your_slack_client_id_here') {
    // Return friendly guidance if not configured in .env
    res.status(400).json({
      error: 'Slack OAuth not configured',
      message: 'Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env',
    });
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

    const accessToken = data.access_token;
    const teamId = data.team?.id || null;
    const incomingChannel = data.incoming_webhook?.channel_id || null;

    // Persist in MySQL
    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        accessToken,
        teamId,
        channelId: incomingChannel,
        isConnected: true,
      },
      create: {
        userId,
        accessToken,
        teamId,
        channelId: incomingChannel,
        isConnected: true,
      },
    });

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

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

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

    await prisma.slackIntegration.updateMany({
      where: { userId },
      data: { isConnected: false },
    });

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

    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        accessToken: webhookUrl || 'dev-mock-slack-token',
        teamId: 'T_REACHINBOX_DEMO',
        channelId: channel || '#alerts',
        isConnected: true,
      },
      create: {
        userId,
        accessToken: webhookUrl || 'dev-mock-slack-token',
        teamId: 'T_REACHINBOX_DEMO',
        channelId: channel || '#alerts',
        isConnected: true,
      },
    });

    res.status(200).json({ success: true, message: 'Connected Slack workspace (Test Mode)' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to connect test Slack', message: error.message });
  }
};

