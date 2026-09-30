import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import areasRouter from './routes/areas';
import ridesRouter from './routes/rides';
import driversRouter from './routes/drivers';
import walletRouter from './routes/wallet';
import { prisma } from './lib/prisma';
import { seedDatabase } from '../prisma/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Dynamic CORS configuration supporting Vercel previews and production
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like same-origin, curl, or serverless invocation)
      if (!origin) return callback(null, true);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (
        origin === frontendUrl ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for simple Vercel deployments
    },
    credentials: true,
  })
);

app.use(express.json());

// Auto-seed Neon Postgres database if empty on startup
let isInitialized = false;
let isInitializing = false;

async function checkAndSeedDatabase() {
  if (isInitialized || isInitializing || !process.env.DATABASE_URL) return;
  isInitializing = true;
  try {
    const count = await prisma.area.count().catch(() => null);
    if (count === 0) {
      console.log('🌱 Fresh Neon database detected. Auto-seeding Dhaka areas & demo accounts...');
      await seedDatabase(prisma);
      console.log('✅ Auto-seed completed successfully.');
    }
    isInitialized = true;
  } catch (err: any) {
    // Database tables might not be created yet if migrations are still running
  } finally {
    isInitializing = false;
  }
}

app.use((req, res, next) => {
  if (!isInitialized && process.env.DATABASE_URL) {
    checkAndSeedDatabase().catch(() => {});
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'dhaka-tesla-pool-api',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use('/api/auth', authRouter);

// Areas and distance routing routes
app.use('/api/areas', areasRouter);

// Ride requests and booking routes
app.use('/api/rides', ridesRouter);

// Driver operations and pool lifecycle routes
app.use('/api/drivers', driversRouter);

// TeslaPay wallet balance, topup, and transactions
app.use('/api/wallet', walletRouter);

// Centralized error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  });
});

// Listen on port only in long-running Node/Docker environments, not in Vercel Serverless
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚗 Dhaka Tesla Pool API listening on port ${PORT}`);
  });
}

export default app;
