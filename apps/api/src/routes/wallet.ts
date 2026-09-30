import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { PaymentStatus } from '@prisma/client';

const router = Router();

// GET /api/wallet/balance - Fetch user's (passenger or driver) wallet balance
router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        walletBalancePaisa: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'NotFound', message: 'User not found' });
      return;
    }

    res.json({
      balancePaisa: user.walletBalancePaisa,
      balanceBdt: Number((user.walletBalancePaisa / 100).toFixed(2)),
    });
  } catch (err: any) {
    console.error('Fetch wallet balance error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch wallet balance',
    });
  }
});

// POST /api/wallet/topup - Top up TeslaPay wallet balance
router.post('/topup', requireAuth, requireRole('PASSENGER'), async (req: Request, res: Response) => {
  try {
    const rawAmount = req.body.amountPaisa ?? req.body.amount;
    const amountPaisa = Number(rawAmount);

    if (!amountPaisa || isNaN(amountPaisa) || amountPaisa <= 0) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Top-up amount must be a positive integer in paisa',
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        walletBalancePaisa: {
          increment: Math.round(amountPaisa),
        },
      },
      select: {
        walletBalancePaisa: true,
      },
    });

    res.json({
      message: `Successfully topped up ৳${(amountPaisa / 100).toFixed(0)} to your TeslaPay wallet`,
      balancePaisa: updatedUser.walletBalancePaisa,
      balanceBdt: Number((updatedUser.walletBalancePaisa / 100).toFixed(2)),
    });
  } catch (err: any) {
    console.error('Top-up wallet error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to top up wallet balance',
    });
  }
});

// GET /api/wallet/transactions - Payment and ride ledger history
router.get('/transactions', requireAuth, requireRole('PASSENGER'), async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        passengerId: req.user!.userId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rideRequest: {
          include: {
            pickupArea: true,
            destinationArea: true,
          },
        },
      },
    });

    res.json(payments);
  } catch (err: any) {
    console.error('Fetch wallet transactions error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch wallet transactions',
    });
  }
});

export default router;
