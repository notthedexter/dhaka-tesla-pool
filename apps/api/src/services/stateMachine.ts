export const VALID_RIDE_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED'],
  STARTED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const VALID_POOL_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  statusCode: number;

  constructor(entity: string, from: string, to: string) {
    super(`Invalid ${entity} status transition from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
    this.statusCode = 400;
  }
}

export function assertRideTransition(currentStatus: string, nextStatus: string): void {
  const allowed = VALID_RIDE_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new InvalidTransitionError('Ride', currentStatus, nextStatus);
  }
}

export function assertPoolTransition(currentStatus: string, nextStatus: string): void {
  const allowed = VALID_POOL_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new InvalidTransitionError('Pool', currentStatus, nextStatus);
  }
}
