import { calculateFare, FARE_CONFIG } from '../services/fare';

describe('Dhaka Tesla Pool - Fare Calculation Engine', () => {
  test('Nusrat Solo Ride (Banani -> Mohakhali, ~2.1 km, 1 passenger)', () => {
    const result = calculateFare(2.1, 1);

    expect(result.baseFare).toBe(2500);          // 25.00 BDT base fare
    expect(result.distanceCharge).toBe(2100);    // 2.1 km * 10.00 BDT/km = 21.00 BDT
    expect(result.rawFare).toBe(4600);           // 46.00 BDT raw fare
    expect(result.poolDiscount).toBe(0);         // No discount for solo
    expect(result.totalFare).toBe(4600);         // 46.00 BDT total
    expect(result.discountPercentage).toBe(0);
    expect(result.poolSize).toBe(1);

    // Verify integer paisa guarantee
    expect(Number.isInteger(result.totalFare)).toBe(true);
  });

  test('Nusrat Pooled with Rafiq (2.1 km, 2 passengers in Bullet -> 20% discount)', () => {
    const result = calculateFare(2.1, 2);

    expect(result.baseFare).toBe(2500);
    expect(result.distanceCharge).toBe(2100);
    expect(result.rawFare).toBe(4600);
    expect(result.poolDiscount).toBe(920);        // 20% of 4600 = 920 paisa
    expect(result.totalFare).toBe(3680);         // 4600 - 920 = 3680 paisa (36.80 BDT)
    expect(result.discountPercentage).toBe(20);
    expect(result.poolSize).toBe(2);

    // Hand calculation check
    expect(result.totalFare).toBe(Math.round(4600 * 0.8));
    expect(Number.isInteger(result.totalFare)).toBe(true);
  });

  test('Full Pool with Shirin (2.1 km, 3 passengers in Bullet -> 30% discount)', () => {
    const result = calculateFare(2.1, 3);

    expect(result.baseFare).toBe(2500);
    expect(result.distanceCharge).toBe(2100);
    expect(result.rawFare).toBe(4600);
    expect(result.poolDiscount).toBe(1380);       // 30% of 4600 = 1380 paisa
    expect(result.totalFare).toBe(3220);         // 4600 - 1380 = 3220 paisa (32.20 BDT)
    expect(result.discountPercentage).toBe(30);
    expect(result.poolSize).toBe(3);

    // Hand calculation check
    expect(result.totalFare).toBe(Math.round(4600 * 0.7));
    expect(Number.isInteger(result.totalFare)).toBe(true);
  });

  test('Zero distance trip charges exactly base fare', () => {
    const result = calculateFare(0, 1);
    expect(result.distanceCharge).toBe(0);
    expect(result.totalFare).toBe(2500);
  });

  test('Negative distance throws an error', () => {
    expect(() => calculateFare(-5, 1)).toThrow('Distance cannot be negative');
  });

  test('Validates integer paisa storage to avoid floating point imprecision', () => {
    // 3.33 km with 20% discount
    const result = calculateFare(3.33, 2);
    expect(Number.isInteger(result.baseFare)).toBe(true);
    expect(Number.isInteger(result.distanceCharge)).toBe(true);
    expect(Number.isInteger(result.poolDiscount)).toBe(true);
    expect(Number.isInteger(result.totalFare)).toBe(true);
  });

  test('Person Count Fare: Single seat booking (fare x 1)', () => {
    const result = calculateFare(2.1, 1, 1);
    expect(result.seatsCount).toBe(1);
    expect(result.seatMultiplier).toBe(1.0);
    expect(result.soloFare).toBe(4600);
    expect(result.totalFare).toBe(4600);
  });

  test('Person Count Fare: Double seat booking (fare x 1.75 best practice companion rate)', () => {
    const result = calculateFare(2.1, 1, 2);
    expect(result.seatsCount).toBe(2);
    expect(result.seatMultiplier).toBe(1.75);
    expect(result.soloFare).toBe(4600); // Solo fare is 46.00 BDT
    expect(result.totalFare).toBe(8050); // Passenger pays 80.50 BDT (2 persons)
    // Driver wallet receives ONLY soloFare (4600), NOT totalFare (8050)
    expect(result.soloFare).toBeLessThan(result.totalFare);
    expect(result.soloFare).toBe(4600);
    expect(Number.isInteger(result.totalFare)).toBe(true);
  });

  test('Person Count Fare: Triple seat booking (fare x 2.40 best practice charter rate)', () => {
    const result = calculateFare(2.1, 1, 3);
    expect(result.seatsCount).toBe(3);
    expect(result.seatMultiplier).toBe(2.40);
    expect(result.soloFare).toBe(4600);
    expect(result.totalFare).toBe(11040); // Passenger pays 110.40 BDT (3 persons)
    // Driver wallet receives ONLY soloFare (4600), NOT totalFare (11040)
    expect(result.soloFare).toBe(4600);
    expect(Number.isInteger(result.totalFare)).toBe(true);
  });
});
