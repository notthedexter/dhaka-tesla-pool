import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import areasRouter from './routes/areas';
import ridesRouter from './routes/rides';
import driversRouter from './routes/drivers';
import walletRouter from './routes/wallet';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'dhaka-tesla-pool-api',
    timestamp: new Date().toISOString()
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
    message: err.message || 'An unexpected error occurred'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚗 Dhaka Tesla Pool API listening on port ${PORT}`);
  });
}

export default app;
