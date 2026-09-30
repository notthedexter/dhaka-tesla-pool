// Fare model configuration (integer paisa: 1 BDT = 100 paisa)
export const FARE_CONFIG = {
  BASE_FARE_PAISA: 2500,     // 25 BDT base fare
  PER_KM_RATE_PAISA: 1000,   // 10 BDT per km
  POOL_DISCOUNT_2: 0.20,     // 20% discount for 2 passengers
  POOL_DISCOUNT_3: 0.30,     // 30% discount for 3 passengers
};

// User-facing labels for statuses
export const RIDE_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Finding a Tesla...',
  MATCHED: 'Tesla Assigned',
  DRIVER_ARRIVED: 'Tesla Arrived at Pickup',
  STARTED: 'On the Way',
  COMPLETED: 'Trip Completed',
  CANCELLED: 'Trip Cancelled',
};

// Lifecycle transition validation matrix
export const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED'],
  STARTED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Verified Dhaka Area Seed Coordinates for client and server fallback
export const DHAKA_AREAS_FALLBACK = [
  { id: 1, name: 'Banani', latitude: 23.7937, longitude: 90.4045 },
  { id: 2, name: 'Gulshan 1', latitude: 23.7806, longitude: 90.4169 },
  { id: 3, name: 'Gulshan 2', latitude: 23.7947, longitude: 90.4137 },
  { id: 4, name: 'Mohakhali', latitude: 23.7776, longitude: 90.4005 },
  { id: 5, name: 'Dhanmondi', latitude: 23.7535, longitude: 90.3703 },
  { id: 6, name: 'Mirpur', latitude: 23.8084, longitude: 90.3683 },
  { id: 7, name: 'Uttara', latitude: 23.8728, longitude: 90.3984 },
  { id: 8, name: 'Farmgate', latitude: 23.7590, longitude: 90.3871 },
  { id: 9, name: 'Bashundhara', latitude: 23.8167, longitude: 90.4294 },
  { id: 10, name: 'Motijheel', latitude: 23.7273, longitude: 90.4212 },
  { id: 11, name: 'Shahbag', latitude: 23.7373, longitude: 90.3962 },
  { id: 12, name: 'Tejgaon', latitude: 23.7628, longitude: 90.3913 },
];
