import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { getDrivingRoute } from '../services/osrm';
import { calculateFare } from '../services/fare';
import { PaymentMethod, RideStatus, PoolMemberStatus } from '@prisma/client';

const router = Router();

const CreateRideSchema = z.object({
  pickupAreaId: z.number().int({ message: 'Pickup area ID must be an integer' }),
  destinationAreaId: z.number().int({ message: 'Destination area ID must be an integer' }),
  seatsNeeded: z.number().int().min(1).max(3).default(1),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
});

// POST /api/rides - Create a new ride request
router.post('/', requireAuth, requireRole('PASSENGER'), async (req: Request, res: Response) => {
  try {
    const parseResult = CreateRideSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'ValidationError',
        message: parseResult.error.errors[0]?.message || 'Invalid ride request parameters',
      });
      return;
    }

    const { pickupAreaId, destinationAreaId, seatsNeeded, paymentMethod } = parseResult.data;

    if (pickupAreaId === destinationAreaId) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Pickup and destination areas cannot be identical',
      });
      return;
    }

    const [pickupArea, destinationArea] = await Promise.all([
      prisma.area.findUnique({ where: { id: pickupAreaId } }),
      prisma.area.findUnique({ where: { id: destinationAreaId } }),
    ]);

    if (!pickupArea || !destinationArea) {
      res.status(404).json({
        error: 'NotFound',
        message: 'One or both selected areas do not exist',
      });
      return;
    }

    // Calculate real driving distance via OSRM
    const route = await getDrivingRoute([
      { lat: pickupArea.latitude, lng: pickupArea.longitude },
      { lat: destinationArea.latitude, lng: destinationArea.longitude },
    ]);

    // Initial estimated fare for solo rider (adjusted dynamically if pooled)
    const fare = calculateFare(route.distanceKm, 1);

    // If payment method is TeslaPay, check if wallet has enough balance
    if (paymentMethod === PaymentMethod.TESLAPAY) {
      const passenger = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { walletBalancePaisa: true },
      });

      if (!passenger || passenger.walletBalancePaisa < fare.totalFare) {
        res.status(400).json({
          error: 'InsufficientBalance',
          message: `Insufficient TeslaPay balance. Required: ৳${(fare.totalFare / 100).toFixed(0)}, Available: ৳${((passenger?.walletBalancePaisa || 0) / 100).toFixed(0)}. Please select Cash or top up your wallet.`,
        });
        return;
      }
    }

    const ride = await prisma.rideRequest.create({
      data: {
        passengerId: req.user!.userId,
        pickupAreaId,
        destinationAreaId,
        seatsNeeded,
        estimatedFarePaisa: fare.totalFare,
        distanceKm: route.distanceKm,
        status: RideStatus.REQUESTED,
        paymentMethod,
      },
      include: {
        pickupArea: true,
        destinationArea: true,
      },
    });

    res.status(201).json({
      message: 'Ride requested successfully',
      ride,
      fare,
      route: {
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        coordinates: route.coordinates,
      },
    });
  } catch (err: any) {
    console.error('Create ride error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create ride request',
    });
  }
});

// GET /api/rides/my - List current passenger's rides
router.get('/my', requireAuth, requireRole('PASSENGER'), async (req: Request, res: Response) => {
  try {
    const rides = await prisma.rideRequest.findMany({
      where: { passengerId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        pickupArea: true,
        destinationArea: true,
        pool: {
          include: {
            tesla: true,
            driver: { select: { id: true, name: true } },
          },
        },
        payment: true,
      },
    });

    res.json(rides);
  } catch (err: any) {
    console.error('Fetch my rides error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch ride requests',
    });
  }
});

// GET /api/rides/:id - Get detailed ride request
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const ride = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: {
        pickupArea: true,
        destinationArea: true,
        passenger: { select: { id: true, name: true, email: true } },
        pool: {
          include: {
            tesla: true,
            driver: { select: { id: true, name: true } },
            members: {
              include: {
                passenger: { select: { id: true, name: true } },
                rideRequest: {
                  include: {
                    destinationArea: true,
                  },
                },
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!ride) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Ride request not found',
      });
      return;
    }

    // Security check: only the passenger or drivers can view the ride
    if (ride.passengerId !== req.user!.userId && req.user!.role !== 'DRIVER') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this ride',
      });
      return;
    }

    res.json(ride);
  } catch (err: any) {
    console.error('Fetch ride detail error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch ride detail',
    });
  }
});

// PATCH /api/rides/:id/cancel - Cancel a ride
router.patch('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const ride = await prisma.rideRequest.findUnique({
      where: { id: req.params.id },
      include: { pool: true },
    });

    if (!ride) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Ride request not found',
      });
      return;
    }

    // Security check: only the passenger who requested the ride can cancel it
    if (ride.passengerId !== req.user!.userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only cancel your own ride request',
      });
      return;
    }

    // Cancellation rule: Allowed only in REQUESTED or MATCHED state
    if (ride.status !== RideStatus.REQUESTED && ride.status !== RideStatus.MATCHED) {
      res.status(400).json({
        error: 'InvalidTransition',
        message: `Cannot cancel ride in ${ride.status} state. Cancellation is only permitted before trip starts.`,
      });
      return;
    }

    // If ride is attached to a pool, update atomically
    if (ride.poolId) {
      const updated = await prisma.$transaction(async (tx) => {
        // Decrement occupied seats in pool
        await tx.pool.update({
          where: { id: ride.poolId! },
          data: {
            occupiedSeats: {
              decrement: ride.seatsNeeded,
            },
          },
        });

        // Mark pool member as cancelled
        await tx.poolMember.updateMany({
          where: {
            poolId: ride.poolId!,
            rideRequestId: ride.id,
          },
          data: {
            status: PoolMemberStatus.CANCELLED,
          },
        });

        // Mark ride as cancelled
        return tx.rideRequest.update({
          where: { id: ride.id },
          data: {
            status: RideStatus.CANCELLED,
          },
          include: {
            pickupArea: true,
            destinationArea: true,
          },
        });
      });

      res.json({
        message: 'Ride cancelled successfully and removed from pool',
        ride: updated,
      });
    } else {
      const updated = await prisma.rideRequest.update({
        where: { id: ride.id },
        data: {
          status: RideStatus.CANCELLED,
        },
        include: {
          pickupArea: true,
          destinationArea: true,
        },
      });

      res.json({
        message: 'Ride cancelled successfully',
        ride: updated,
      });
    }
  } catch (err: any) {
    console.error('Cancel ride error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to cancel ride request',
    });
  }
});

export default router;
