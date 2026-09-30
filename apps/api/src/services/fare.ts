export interface FareResult {
  baseFare: number;          // in paisa
  distanceCharge: number;    // in paisa
  soloFare: number;          // in paisa (1-person single seat standard rate)
  seatMultiplier: number;    // 1.0 for single, 1.75 for double, 2.4 for triple
  rawFare: number;           // in paisa (before pool discount)
  poolDiscount: number;      // in paisa
  totalFare: number;         // in paisa (after discount)
  discountPercentage: number;// e.g. 0, 20, 30
  poolSize: number;
  seatsCount: number;
}

export const FARE_CONFIG = {
  BASE_FARE_PAISA: 2500,     // 25.00 BDT
  PER_KM_RATE_PAISA: 1000,   // 10.00 BDT per km
  // Person / Seat count multipliers (Industry Best Practice for ride-pooling companions)
  // Single seat: 1.0x (100% of standard solo rate)
  // Double seats: 1.75x (+75% for 2nd passenger, 12.5% per-seat companion savings)
  // Triple seats: 2.40x (+65% for 3rd passenger, 20% per-seat companion savings)
  SEAT_MULTIPLIERS: {
    1: 1.0,
    2: 1.75,
    3: 2.4,
  } as Record<number, number>,
  POOL_DISCOUNT_2: 0.20,     // 20% discount for 2 passengers
  POOL_DISCOUNT_3: 0.30,     // 30% discount for 3 passengers
};

/**
 * Calculates passenger fare in integer paisa (1 BDT = 100 paisa)
 * Hand-verifiable formula:
 * soloFare = baseFare + (distanceKm * perKmRate)
 * rawFare = soloFare * seatMultiplier
 * totalFare = rawFare - poolDiscount
 */
export function calculateFare(
  distanceKm: number,
  poolSize: number = 1,
  seatsCount: number = 1
): FareResult {
  if (distanceKm < 0) {
    throw new Error('Distance cannot be negative');
  }

  const validSeats = Math.max(1, Math.min(3, Math.round(seatsCount || 1)));
  const seatMultiplier = FARE_CONFIG.SEAT_MULTIPLIERS[validSeats] || 1.0;

  const baseFare = FARE_CONFIG.BASE_FARE_PAISA;
  const distanceCharge = Math.round(distanceKm * FARE_CONFIG.PER_KM_RATE_PAISA);
  // Solo fare is the standard 1-person rate (single seat, no pooling discount)
  const soloFare = baseFare + distanceCharge;

  // Person-count raw fare before pool discount
  const rawFare = Math.round(soloFare * seatMultiplier);

  // Pool discount applies if poolSize >= 2 and seatsCount < poolSize (i.e. sharing with other bookings)
  let discountRate = 0;
  if (poolSize >= 3 && validSeats < 3) {
    discountRate = FARE_CONFIG.POOL_DISCOUNT_3;
  } else if (poolSize >= 2 && validSeats < 2) {
    discountRate = FARE_CONFIG.POOL_DISCOUNT_2;
  }

  const poolDiscount = Math.round(rawFare * discountRate);
  const totalFare = Math.max(
    Math.round(baseFare * seatMultiplier) - poolDiscount,
    rawFare - poolDiscount
  );

  return {
    baseFare,
    distanceCharge,
    soloFare,
    seatMultiplier,
    rawFare,
    poolDiscount,
    totalFare,
    discountPercentage: Math.round(discountRate * 100),
    poolSize,
    seatsCount: validSeats,
  };
}
