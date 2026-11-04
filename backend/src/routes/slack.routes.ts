import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  connectSlack,
  slackCallback,
  getSlackStatus,
  disconnectSlack,
  testConnectSlack,
} from '../controllers/slack.controller.js';

const router = Router();

// OAuth callback is called by Slack's servers, no session auth required
router.get('/callback', slackCallback);

// Protected endpoints
router.get('/connect', requireAuth, connectSlack);
router.get('/status', requireAuth, getSlackStatus);
router.post('/disconnect', requireAuth, disconnectSlack);
router.post('/test-connect', requireAuth, testConnectSlack);

export default router;
