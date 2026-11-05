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

const isGoogleConfigured =
  Boolean(config.google.clientId) &&
  Boolean(config.google.clientSecret) &&
  config.google.clientId !== 'your_google_client_id_here';

// Google OAuth initiate
router.get('/google', (req, res, next) => {
  if (!isGoogleConfigured) {
    // Graceful simulated Google login when live credentials are not set
    const demoGoogleUser = {
      id: 'google_user_demo_123',
      googleId: '10987654321',
      name: 'Google User',
      email: 'user.google@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser',
    };
    req.login(demoGoogleUser, (err) => {
      if (err) return next(err);
      return res.redirect(`${config.frontendUrl}/dashboard`);
    });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth callback
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isGoogleConfigured) {
      return res.redirect(`${config.frontendUrl}/dashboard`);
    }
    passport.authenticate('google', {
      failureRedirect: `${config.frontendUrl}/login?error=auth_failed`,
    })(req, res, next);
  },
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
