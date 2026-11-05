import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

// Safe bcrypt helper for ESM / CJS module compatibility
const getBcrypt = () => {
  return (bcrypt as any)?.hash ? bcrypt : (bcrypt as any)?.default || bcrypt;
};

// In-memory fallback user store when MySQL is offline or pending credentials in .env
const inMemoryUsers = new Map<string, any>();

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
 * Register a new user with Email and Password.
 * Creates the user record but does NOT auto-login, allowing the user to sign in explicitly.
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
    const displayName = name?.trim() || normalizedEmail.split('@')[0];
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`;
    const hashedPassword = await getBcrypt().hash(password, 10);

    let newUser: any = null;

    try {
      // 1. Try MySQL Database
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      }

      newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: displayName,
          avatar,
        },
      });

      await prisma.sender.create({
        data: {
          userId: newUser.id,
          email: newUser.email,
        },
      });
    } catch (dbErr: any) {
      console.warn('MySQL unavailable, using in-memory store for session:', dbErr.message);

      if (inMemoryUsers.has(normalizedEmail)) {
        res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      }

      newUser = {
        id: `usr_${Date.now()}`,
        email: normalizedEmail,
        password: hashedPassword,
        name: displayName,
        avatar,
        createdAt: new Date().toISOString(),
      };
      inMemoryUsers.set(normalizedEmail, newUser);
    }

    // Do NOT auto-login on registration: Return 201 so user can explicitly sign in
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in with your credentials.',
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
};

/**
 * Login with Email and Password.
 */
export const loginWithPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user: any = null;

    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {
      // Fallback to in-memory store
      user = inMemoryUsers.get(normalizedEmail);
    }

    if (!user) {
      user = inMemoryUsers.get(normalizedEmail);
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.password) {
      res.status(400).json({
        error: 'This account was created using Google. Please click "Continue with Google".',
      });
      return;
    }

    const isMatch = await getBcrypt().compare(password, user.password);
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
      const { password: _, ...userWithoutPassword } = user;
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
 * Dev login helper: Instant 1-click test login.
 */
export const devLogin = async (req: Request, res: Response): Promise<void> => {
  const demoEmail = 'demo.user@reachinbox.ai';
  let user: any = null;

  try {
    user = await prisma.user.findUnique({
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

      await prisma.sender.create({
        data: {
          userId: user.id,
          email: demoEmail,
        },
      });
    }
  } catch {
    // In-memory demo user if database server is temporarily offline
    user = {
      id: 'demo-user-id',
      googleId: 'google-dev-demo-id',
      name: 'ReachInbox Demo User',
      email: demoEmail,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
      createdAt: new Date().toISOString(),
    };
  }

  req.login(user, (err) => {
    if (err) {
      res.status(500).json({ error: 'Login failed', details: err.message });
      return;
    }
    res.status(200).json({ message: 'Dev login successful', user });
  });
};
