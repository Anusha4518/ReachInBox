import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

export const getMe = (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ user: null });
    return;
  }
  res.status(200).json({ user: req.user });
};

export const logout = (req: Request, res: Response): void => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to log out' });
      return;
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destroy error:', sessionErr);
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
};

/**
 * Dev login helper: Allows testing the full application even before
 * the developer enters actual Google OAuth credentials in .env.
 */
export const devLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const demoEmail = 'demo.user@reachinbox.ai';
    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'google-dev-demo-id',
          name: 'ReachInbox Demo User',
          email: demoEmail,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
        },
      });

      // Default sender
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: demoEmail,
        },
      });
    }

    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ error: 'Login failed', details: err.message });
        return;
      }
      res.status(200).json({ message: 'Dev login successful', user });
    });
  } catch (error: any) {
    console.error('Dev login error:', error);
    res.status(500).json({ error: 'Dev login failed', details: error.message });
  }
};
