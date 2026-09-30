import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  assertPoolTransition,
  assertRideTransition,
  InvalidTransitionError,
} from '../services/stateMachine';
import {
  RideStatus,
  PoolStatus,
  PoolMemberStatus,
  PaymentStatus,
  PaymentMethod,
} from '@prisma/client';

const router = Router();

// PATCH /api/drivers/status - Toggle driver online / offline
router.patch('/status', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Field "isOnline" must be a boolean',
      });
      return;
    }

    const tesla = await prisma.tesla.update({
      where: { driverId: req.user!.userId },
      data: { isOnline },
    });

    res.json({
      message: `Driver status set to ${isOnline ? 'ONLINE' : 'OFFLINE'}`,
      isOnline: tesla.isOnline,
      tesla,
    });
  } catch (err: any) {
    console.error('Update driver status error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update driver status',
    });
  }
});

// GET /api/drivers/requests - List pending ride requests (requires driver to be online)
router.get('/requests', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const tesla = await prisma.tesla.findUnique({
      where: { driverId: req.user!.userId },
    });

    if (!tesla || !tesla.isOnline) {
      res.status(400).json({
        error: 'DriverOffline',
        message: 'You must toggle your status to ONLINE to see ride requests',
      });
      return;
    }

    const pendingRequests = await prisma.rideRequest.findMany({
      where: { status: RideStatus.REQUESTED },
      orderBy: { createdAt: 'asc' },
      include: {
        pickupArea: true,
        destinationArea: true,
        passenger: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(pendingRequests);
  } catch (err: any) {
    console.error('Fetch driver requests error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch ride requests',
    });
  }
});

// POST /api/drivers/accept/:rideId - Accept a ride request and create/join pool
router.post('/accept/:rideId', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const tesla = await prisma.tesla.findUnique({
      where: { driverId: req.user!.userId },
    });

    if (!tesla || !tesla.isOnline) {
      res.status(400).json({
        error: 'DriverOffline',
        message: 'You must be online to accept rides',
      });
      return;
    }

    const ride = await prisma.rideRequest.findUnique({
      where: { id: req.params.rideId },
      include: { pickupArea: true, destinationArea: true },
    });

    if (!ride) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Ride request not found',
      });
      return;
    }

    if (ride.status !== RideStatus.REQUESTED) {
      res.status(400).json({
        error: 'InvalidStatus',
        message: `Ride request is already ${ride.status}`,
      });
      return;
    }

    // Atomic transaction: create, pool, or queue advance trip with strict 1-advance-trip limit
    const result = await prisma.$transaction(async (tx) => {
      // Find all ongoing pools for this driver (oldest is current, second is advance)
      const existingPools = await tx.pool.findMany({
        where: {
          driverId: req.user!.userId,
          status: { in: [PoolStatus.ACTIVE, PoolStatus.EN_ROUTE] },
        },
        orderBy: { createdAt: 'asc' },
        include: { tesla: true },
      });

      let targetPool;

      if (existingPools.length === 0) {
        // No trips in progress: create initial active pool
        targetPool = await tx.pool.create({
          data: {
            teslaId: tesla.id,
            driverId: req.user!.userId,
            pickupAreaId: ride.pickupAreaId,
            status: PoolStatus.ACTIVE,
            occupiedSeats: ride.seatsNeeded,
          },
          include: { tesla: true },
        });
      } else {
        const currentPool = existingPools[0];
        const canPoolIntoCurrent =
          currentPool.status === PoolStatus.ACTIVE &&
          currentPool.pickupAreaId === ride.pickupAreaId &&
          currentPool.occupiedSeats + ride.seatsNeeded <= tesla.totalSeats;

        if (canPoolIntoCurrent) {
          // Add into current active pool
          targetPool = await tx.pool.update({
            where: { id: currentPool.id },
            data: {
              occupiedSeats: { increment: ride.seatsNeeded },
            },
            include: { tesla: true },
          });
        } else {
          // Needs an advance / awaiting trip
          const hasAdvanceTrip = existingPools.length >= 2;

          if (hasAdvanceTrip) {
            throw new Error(
              'Driver already has an active trip and 1 advance trip queued. Maximum 1 advance trip allowed.'
            );
          } else {
            // Driver has 1 active trip, create their 1 allowed advance trip!
            targetPool = await tx.pool.create({
              data: {
                teslaId: tesla.id,
                driverId: req.user!.userId,
                pickupAreaId: ride.pickupAreaId,
                status: PoolStatus.ACTIVE,
                occupiedSeats: ride.seatsNeeded,
              },
              include: { tesla: true },
            });
          }
        }
      }

      // Create PoolMember
      const poolMember = await tx.poolMember.create({
        data: {
          poolId: targetPool.id,
          rideRequestId: ride.id,
          passengerId: ride.passengerId,
          seats: ride.seatsNeeded,
          farePaisa: ride.estimatedFarePaisa,
          status: PoolMemberStatus.JOINED,
        },
      });

      // Update RideRequest to MATCHED
      const updatedRide = await tx.rideRequest.update({
        where: { id: ride.id },
        data: {
          status: RideStatus.MATCHED,
          poolId: targetPool.id,
        },
        include: {
          pickupArea: true,
          destinationArea: true,
        },
      });

      return { pool: targetPool, poolMember, ride: updatedRide };
    });

    res.json({
      message: 'Ride accepted successfully',
      pool: result.pool,
      ride: result.ride,
    });
  } catch (err: any) {
    console.error('Accept ride error:', err);
    res.status(400).json({
      error: 'AcceptRideFailed',
      message: err.message || 'Failed to accept ride request',
    });
  }
});

// GET /api/drivers/pool/current - Get active and awaiting pools with all members
router.get('/pool/current', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const pools = await prisma.pool.findMany({
      where: {
        driverId: req.user!.userId,
        status: { in: [PoolStatus.ACTIVE, PoolStatus.EN_ROUTE] },
      },
      orderBy: { createdAt: 'asc' }, // Oldest is current, second is awaiting
      include: {
        tesla: true,
        pickupArea: true,
        members: {
          where: { status: { not: PoolMemberStatus.CANCELLED } },
          include: {
            passenger: { select: { id: true, name: true, email: true } },
            rideRequest: {
              include: { destinationArea: true },
            },
          },
        },
      },
    });

    const currentPool = pools[0] || null;
    const awaitingPool = pools[1] || null;

    res.json({
      currentPool,
      awaitingPool,
      // Backwards-compatibility properties
      ...(currentPool
        ? {
            id: currentPool.id,
            teslaId: currentPool.teslaId,
            status: currentPool.status,
            occupiedSeats: currentPool.occupiedSeats,
            pickupArea: currentPool.pickupArea,
            tesla: currentPool.tesla,
            members: currentPool.members,
            createdAt: currentPool.createdAt,
          }
        : {}),
    });
  } catch (err: any) {
    console.error('Fetch current pool error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch current pool',
    });
  }
});

// PATCH /api/drivers/pool/:poolId/arrive - Driver arrives at pickup area
router.patch('/pool/:poolId/arrive', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.poolId },
    });

    if (!pool || pool.driverId !== req.user!.userId) {
      res.status(404).json({ error: 'NotFound', message: 'Pool not found' });
      return;
    }

    assertPoolTransition(pool.status, PoolStatus.EN_ROUTE);

    const updated = await prisma.$transaction(async (tx) => {
      // Update pool status to EN_ROUTE (driver has arrived, boarding / departing)
      const p = await tx.pool.update({
        where: { id: pool.id },
        data: { status: PoolStatus.EN_ROUTE },
      });

      // Update all member rides to DRIVER_ARRIVED
      await tx.rideRequest.updateMany({
        where: {
          poolId: pool.id,
          status: RideStatus.MATCHED,
        },
        data: {
          status: RideStatus.DRIVER_ARRIVED,
        },
      });

      // Update pool member statuses to PICKED_UP
      await tx.poolMember.updateMany({
        where: {
          poolId: pool.id,
          status: PoolMemberStatus.JOINED,
        },
        data: {
          status: PoolMemberStatus.PICKED_UP,
        },
      });

      return p;
    });

    res.json({
      message: 'Driver marked as arrived at pickup area',
      status: updated.status,
      pool: updated,
    });
  } catch (err: any) {
    const statusCode = err instanceof InvalidTransitionError ? err.statusCode : 400;
    res.status(statusCode).json({
      error: err.name || 'TransitionError',
      message: err.message,
    });
  }
});

// PATCH /api/drivers/pool/:poolId/start - Trip starts on the road
router.patch('/pool/:poolId/start', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.poolId },
    });

    if (!pool || pool.driverId !== req.user!.userId) {
      res.status(404).json({ error: 'NotFound', message: 'Pool not found' });
      return;
    }

    if (pool.status !== PoolStatus.EN_ROUTE) {
      res.status(400).json({
        error: 'InvalidTransition',
        message: `Cannot start trip from pool status ${pool.status}. Must be EN_ROUTE (driver arrived).`,
      });
      return;
    }

    // Update member rides to STARTED
    await prisma.rideRequest.updateMany({
      where: {
        poolId: pool.id,
        status: RideStatus.DRIVER_ARRIVED,
      },
      data: {
        status: RideStatus.STARTED,
      },
    });

    res.json({
      message: 'Trip started successfully. All passengers marked ON_THE_WAY.',
      status: 'STARTED',
    });
  } catch (err: any) {
    res.status(400).json({
      error: 'StartTripFailed',
      message: err.message,
    });
  }
});

// PATCH /api/drivers/pool/:poolId/complete - Complete trip & process payments
router.patch('/pool/:poolId/complete', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.poolId },
      include: {
        members: {
          where: { status: { not: PoolMemberStatus.CANCELLED } },
          include: { rideRequest: true, passenger: true },
        },
      },
    });

    if (!pool || pool.driverId !== req.user!.userId) {
      res.status(404).json({ error: 'NotFound', message: 'Pool not found' });
      return;
    }

    assertPoolTransition(pool.status, PoolStatus.COMPLETED);

    // Enforce that trip has actually been started before it can be completed
    const hasStarted = pool.members.some(
      (m) => m.rideRequest.status === RideStatus.STARTED
    );

    if (!hasStarted) {
      res.status(400).json({
        error: 'TripNotStarted',
        message: 'Cannot complete trip before starting it. You must start the trip first.',
      });
      return;
    }

    const completed = await prisma.$transaction(async (tx) => {
      // 1. Mark pool completed
      const p = await tx.pool.update({
        where: { id: pool.id },
        data: { status: PoolStatus.COMPLETED },
      });

      // 2. Process each passenger member
      for (const member of pool.members) {
        // Mark ride completed
        await tx.rideRequest.update({
          where: { id: member.rideRequestId },
          data: { status: RideStatus.COMPLETED },
        });

        // Mark member dropped off
        await tx.poolMember.update({
          where: { id: member.id },
          data: { status: PoolMemberStatus.DROPPED_OFF },
        });

        // Process payment
        const fare = member.farePaisa;
        const isTeslaPay = member.rideRequest.paymentMethod === PaymentMethod.TESLAPAY;

        if (isTeslaPay) {
          // Deduct from passenger's wallet
          await tx.user.update({
            where: { id: member.passengerId },
            data: {
              walletBalancePaisa: {
                decrement: fare,
              },
            },
          });
        }

        // Record completed payment
        await tx.payment.upsert({
          where: { rideRequestId: member.rideRequestId },
          update: {
            amountPaisa: fare,
            status: PaymentStatus.COMPLETED,
          },
          create: {
            rideRequestId: member.rideRequestId,
            passengerId: member.passengerId,
            amountPaisa: fare,
            method: member.rideRequest.paymentMethod,
            status: PaymentStatus.COMPLETED,
          },
        });
      }

      return p;
    });

    res.json({
      message: 'Pool trip completed successfully! All fares collected and passengers dropped off.',
      status: PoolStatus.COMPLETED,
      pool: completed,
    });
  } catch (err: any) {
    const statusCode = err instanceof InvalidTransitionError ? err.statusCode : 400;
    res.status(statusCode).json({
      error: err.name || 'CompleteTripFailed',
      message: err.message,
    });
  }
});

// GET /api/drivers/history - Past completed pool trips
router.get('/history', requireAuth, requireRole('DRIVER'), async (req: Request, res: Response) => {
  try {
    const pools = await prisma.pool.findMany({
      where: {
        driverId: req.user!.userId,
        status: PoolStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        pickupArea: true,
        members: {
          include: {
            passenger: { select: { id: true, name: true } },
            rideRequest: {
              include: { destinationArea: true, payment: true },
            },
          },
        },
      },
    });

    res.json(pools);
  } catch (err: any) {
    console.error('Fetch driver history error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch driver trip history',
    });
  }
});

export default router;
