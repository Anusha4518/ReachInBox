import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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
 * Register a new user with Email and Password
 */
export const registerWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name?.trim() || normalizedEmail.split('@')[0];
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`;

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: displayName,
        avatar,
      },
    });

    // Create default sender record for outreach campaigns
    await prisma.sender.create({
      data: {
        userId: newUser.id,
        email: newUser.email,
      },
    });

    // Establish session
    req.login(newUser, (err) => {
      if (err) {
        res.status(500).json({ error: 'Session creation failed' });
        return;
      }
      const { password: _, ...userWithoutPassword } = newUser as any;
      res.status(201).json({
        message: 'Account created successfully',
        user: userWithoutPassword,
      });
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
};

/**
 * Login with Email and Password
 */
export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.password) {
      res.status(400).json({
        error: 'This account was signed up using Google. Please click "Continue with Google" above.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Establish session
    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ error: 'Login session failed' });
        return;
      }
      const { password: _, ...userWithoutPassword } = user as any;
      res.status(200).json({
        message: 'Login successful',
        user: userWithoutPassword,
      });
    });
  } catch (error: any) {
    console.error('Password login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
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
