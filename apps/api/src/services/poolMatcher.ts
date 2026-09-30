import { prisma } from '../lib/prisma';
import { PoolStatus, PoolMemberStatus, RideStatus } from '@prisma/client';
import { calculateFare } from './fare';

export interface MatchResult {
  matched: boolean;
  poolId?: string;
  reason?: string;
  totalPoolSize?: number;
}

/**
 * Recalculates discounted fares for all members of a pool based on its current occupied seats.
 * Base fare is maintained, distance fare receives 20% discount (2 riders) or 30% discount (3 riders).
 */
export async function recalculatePoolFares(
  tx: any,
  poolId: string
): Promise<void> {
  const pool = await tx.pool.findUnique({
    where: { id: poolId },
    include: {
      members: {
        where: { status: { not: PoolMemberStatus.CANCELLED } },
        include: { rideRequest: true },
      },
    },
  });

  if (!pool) return;

  const poolSize = pool.occupiedSeats;

  for (const member of pool.members) {
    if (!member.rideRequest) continue;

    const seats = member.seats || member.rideRequest.seatsNeeded || 1;
    const newFareResult = calculateFare(member.rideRequest.distanceKm, poolSize, seats);

    // Update pool member fare
    await tx.poolMember.update({
      where: { id: member.id },
      data: { farePaisa: newFareResult.totalFare },
    });

    // Update ride request estimated fare
    await tx.rideRequest.update({
      where: { id: member.rideRequestId },
      data: { estimatedFarePaisa: newFareResult.totalFare },
    });
  }
}

/**
 * Attempts to automatically match an incoming ride request with an existing active pool.
 * Safe against race conditions using Prisma transaction.
 */
export async function attemptPoolMatching(rideRequestId: string): Promise<MatchResult> {
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
  });

  if (!ride) {
    return { matched: false, reason: 'Ride request not found' };
  }

  if (ride.status !== RideStatus.REQUESTED) {
    return { matched: false, reason: `Ride is already ${ride.status}` };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Search for an eligible active pool at the same pickup area with available capacity
    const eligiblePools = await tx.pool.findMany({
      where: {
        status: PoolStatus.ACTIVE,
        pickupAreaId: ride.pickupAreaId,
      },
      include: {
        tesla: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const targetPool = eligiblePools.find(
      (p) => p.occupiedSeats + ride.seatsNeeded <= p.tesla.totalSeats
    );

    if (!targetPool) {
      return { matched: false, reason: 'No matching active pool with available capacity' };
    }

    // 2. Increment pool occupied seats
    const newOccupiedSeats = targetPool.occupiedSeats + ride.seatsNeeded;
    await tx.pool.update({
      where: { id: targetPool.id },
      data: { occupiedSeats: newOccupiedSeats },
    });

    // 3. Create pool member
    await tx.poolMember.create({
      data: {
        poolId: targetPool.id,
        rideRequestId: ride.id,
        passengerId: ride.passengerId,
        seats: ride.seatsNeeded,
        farePaisa: ride.estimatedFarePaisa,
        status: PoolMemberStatus.JOINED,
      },
    });

    // 4. Update ride request status to MATCHED and link to pool
    await tx.rideRequest.update({
      where: { id: ride.id },
      data: {
        status: RideStatus.MATCHED,
        poolId: targetPool.id,
      },
    });

    // 5. Recalculate discounted fares for ALL members in this pool
    await recalculatePoolFares(tx, targetPool.id);

    return {
      matched: true,
      poolId: targetPool.id,
      totalPoolSize: newOccupiedSeats,
    };
  });
}
