// Status Enums (mirrored for frontend and API usage)
export type UserRole = 'PASSENGER' | 'DRIVER';

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PoolStatus =
  | 'ACTIVE'
  | 'EN_ROUTE'
  | 'COMPLETED'
  | 'CANCELLED';

export type PoolMemberStatus =
  | 'JOINED'
  | 'PICKED_UP'
  | 'DROPPED_OFF'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'TESLAPAY';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED';

// Core entity data transfer objects
export interface AreaDto {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  walletBalancePaisa: number;
  tesla?: TeslaDto | null;
}

export interface TeslaDto {
  id: string;
  driverId: string;
  name: string;
  totalSeats: number;
  isOnline: boolean;
}

export interface RideRequestDto {
  id: string;
  passengerId: string;
  passengerName?: string;
  pickupAreaId: number;
  destinationAreaId: number;
  pickupArea: AreaDto;
  destinationArea: AreaDto;
  seatsNeeded: number;
  estimatedFarePaisa: number;
  distanceKm: number;
  status: RideStatus;
  poolId: string | null;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface PoolMemberDto {
  id: string;
  poolId: string;
  rideRequestId: string;
  passengerId: string;
  passengerName: string;
  seats: number;
  farePaisa: number;
  status: PoolMemberStatus;
  destinationArea: AreaDto;
}

export interface PoolDto {
  id: string;
  teslaId: string;
  driverId: string;
  pickupAreaId: number;
  pickupArea: AreaDto;
  status: PoolStatus;
  occupiedSeats: number;
  totalSeats: number;
  teslaName: string;
  driverName: string;
  members: PoolMemberDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteGeometryDto {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][]; // [latitude, longitude] format for Leaflet
}

export interface FareBreakdownDto {
  baseFare: number;       // In paisa
  distanceCharge: number; // In paisa
  rawFare: number;        // In paisa
  poolDiscount: number;   // In paisa
  totalFare: number;      // In paisa
  discountPercentage: number;
  poolSize: number;
}
