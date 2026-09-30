export interface FareResult {
  baseFare: number;          // in paisa
  distanceCharge: number;    // in paisa
  rawFare: number;           // in paisa (before discount)
  poolDiscount: number;      // in paisa
  totalFare: number;         // in paisa (after discount)
  discountPercentage: number;// e.g. 0, 20, 30
  poolSize: number;
}

export const FARE_CONFIG = {
  BASE_FARE_PAISA: 2500,     // 25.00 BDT
  PER_KM_RATE_PAISA: 1000,   // 10.00 BDT per km
  POOL_DISCOUNT_2: 0.20,     // 20% discount for 2 passengers
  POOL_DISCOUNT_3: 0.30,     // 30% discount for 3 passengers
};

/**
 * Calculates passenger fare in integer paisa (1 BDT = 100 paisa)
 * Hand-verifiable formula:
 * passengerFare = baseFare + (distanceKm * perKmRate) - poolDiscount
 */
export function calculateFare(distanceKm: number, poolSize: number = 1): FareResult {
  if (distanceKm < 0) {
    throw new Error('Distance cannot be negative');
  }

  const baseFare = FARE_CONFIG.BASE_FARE_PAISA;
  const distanceCharge = Math.round(distanceKm * FARE_CONFIG.PER_KM_RATE_PAISA);
  const rawFare = baseFare + distanceCharge;

  let discountRate = 0;
  if (poolSize >= 3) {
    discountRate = FARE_CONFIG.POOL_DISCOUNT_3;
  } else if (poolSize >= 2) {
    discountRate = FARE_CONFIG.POOL_DISCOUNT_2;
  }

  const poolDiscount = Math.round(rawFare * discountRate);
  const totalFare = Math.max(baseFare - poolDiscount, rawFare - poolDiscount);

  return {
    baseFare,
    distanceCharge,
    rawFare,
    poolDiscount,
    totalFare,
    discountPercentage: Math.round(discountRate * 100),
    poolSize,
  };
}
