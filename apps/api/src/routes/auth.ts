import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, signToken } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Role must be PASSENGER or DRIVER' }) }),
  teslaName: z.string().optional(),
  totalSeats: z.number().int().min(1).max(6).optional().default(3),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
        errors: parseResult.error.errors,
      });
      return;
    }

    const { name, email, password, role, teslaName, totalSeats } = parseResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'ConflictError',
        message: 'A user with this email address already exists',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Passengers get 1,000 BDT (100,000 paisa) initial balance for MVP demo
    const initialWallet = role === UserRole.PASSENGER ? 100000 : 0;

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        walletBalancePaisa: initialWallet,
        ...(role === UserRole.DRIVER && {
          tesla: {
            create: {
              name: teslaName || 'Tesla',
              totalSeats: totalSeats || 3,
              isOnline: false,
            },
          },
        }),
      },
      include: {
        tesla: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalancePaisa: user.walletBalancePaisa,
        tesla: user.tesla,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to register user',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid email or password',
      });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { tesla: true },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalancePaisa: user.walletBalancePaisa,
        tesla: user.tesla,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to process login',
    });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { tesla: true },
    });

    if (!user) {
      res.status(404).json({
        error: 'NotFound',
        message: 'User not found',
      });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalancePaisa: user.walletBalancePaisa,
        tesla: user.tesla,
      },
    });
  } catch (err: any) {
    console.error('Get profile error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch user profile',
    });
  }
});

export default router;
