import { Router } from 'express';
import passport from '../config/passport.js';
import {
  getMe,
  logout,
  devLogin,
  loginWithPassword,
  registerWithPassword,
} from '../controllers/auth.controller.js';
import { config } from '../config/env.js';

const router = Router();

// Google OAuth initiate
router.get('/google', (req, res, next) => {
  if (!config.google.clientId || config.google.clientId === 'your_google_client_id_here') {
    // Redirect gracefully back to login page with explanatory error flag
    res.redirect(`${config.frontendUrl}/login?error=google_not_configured`);
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${config.frontendUrl}/login?error=auth_failed`,
  }),
  (_req, res) => {
    res.redirect(`${config.frontendUrl}/dashboard`);
  }
);

// Email & Password Authentication
router.post('/login', loginWithPassword);
router.post('/register', registerWithPassword);

// Current user profile
router.get('/me', getMe);

// Logout
router.post('/logout', logout);

// Dev login bypass (for development & testing without live Google credentials)
router.post('/dev-login', devLogin);

export default router;
