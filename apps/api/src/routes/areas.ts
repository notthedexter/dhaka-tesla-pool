import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getDrivingRoute } from '../services/osrm';
import { calculateFare } from '../services/fare';

const router = Router();

// GET /api/areas - Returns all predefined Dhaka areas
router.get('/', async (req: Request, res: Response) => {
  try {
    const areas = await prisma.area.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(areas);
  } catch (err: any) {
    console.error('Error fetching areas:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve Dhaka areas',
    });
  }
});

// GET /api/areas/distance?from={id}&to={id}
router.get('/distance', async (req: Request, res: Response) => {
  try {
    const fromId = parseInt(req.query.from as string, 10);
    const toId = parseInt(req.query.to as string, 10);

    if (isNaN(fromId) || isNaN(toId)) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Query parameters "from" and "to" must be valid integer area IDs',
      });
      return;
    }

    if (fromId === toId) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Pickup and destination areas cannot be the same',
      });
      return;
    }

    const [pickup, destination] = await Promise.all([
      prisma.area.findUnique({ where: { id: fromId } }),
      prisma.area.findUnique({ where: { id: toId } }),
    ]);

    if (!pickup || !destination) {
      res.status(404).json({
        error: 'NotFound',
        message: 'One or both specified areas could not be found',
      });
      return;
    }

    // Call OSRM routing service
    const route = await getDrivingRoute([
      { lat: pickup.latitude, lng: pickup.longitude },
      { lat: destination.latitude, lng: destination.longitude },
    ]);

    const seats = Math.max(1, Math.min(3, Number(req.query.seats) || 1));

    // Calculate fares: person count fare for requested seats and solo/pooled alternatives
    const fare = calculateFare(route.distanceKm, 1, seats);
    const soloFare = calculateFare(route.distanceKm, 1, 1);
    const doubleFare = calculateFare(route.distanceKm, 1, 2);
    const tripleFare = calculateFare(route.distanceKm, 1, 3);
    const pool2Fare = calculateFare(route.distanceKm, 2, seats);
    const pool3Fare = calculateFare(route.distanceKm, 3, seats);

    res.json({
      pickup,
      destination,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      coordinates: route.coordinates,
      seats,
      fare,
      soloFare,
      fareBreakdown: {
        solo: soloFare,
        double: doubleFare,
        triple: tripleFare,
        pooled2: pool2Fare,
        pooled3: pool3Fare,
      },
    });
  } catch (err: any) {
    console.error('Error calculating area distance:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to calculate distance between selected areas',
    });
  }
});

export default router;
