import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Dhaka Tesla Pool...');

  // 1. Seed Dhaka areas with verified lat/long coordinates
  const areas = [
    { name: 'Banani', latitude: 23.7937, longitude: 90.4045 },
    { name: 'Gulshan 1', latitude: 23.7806, longitude: 90.4169 },
    { name: 'Gulshan 2', latitude: 23.7947, longitude: 90.4137 },
    { name: 'Mohakhali', latitude: 23.7776, longitude: 90.4005 },
    { name: 'Dhanmondi', latitude: 23.7535, longitude: 90.3703 },
    { name: 'Mirpur', latitude: 23.8084, longitude: 90.3683 },
    { name: 'Uttara', latitude: 23.8728, longitude: 90.3984 },
    { name: 'Farmgate', latitude: 23.7590, longitude: 90.3871 },
    { name: 'Bashundhara', latitude: 23.8167, longitude: 90.4294 },
    { name: 'Motijheel', latitude: 23.7273, longitude: 90.4212 },
    { name: 'Shahbag', latitude: 23.7373, longitude: 90.3962 },
    { name: 'Tejgaon', latitude: 23.7628, longitude: 90.3913 },
  ];

  for (const area of areas) {
    await prisma.area.upsert({
      where: { name: area.name },
      update: { latitude: area.latitude, longitude: area.longitude },
      create: area,
    });
  }
  console.log(`✅ Seeded ${areas.length} Dhaka areas`);

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Seed Jashim (Driver) and Bullet (his 3-seat Tesla)
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@tesla.pool' },
    update: { name: 'Jashim', role: UserRole.DRIVER },
    create: {
      name: 'Jashim',
      email: 'jashim@tesla.pool',
      passwordHash,
      role: UserRole.DRIVER,
      walletBalancePaisa: 0,
    },
  });

  await prisma.tesla.upsert({
    where: { driverId: jashim.id },
    update: { name: 'Bullet', totalSeats: 3 },
    create: {
      driverId: jashim.id,
      name: 'Bullet',
      totalSeats: 3,
      isOnline: false,
    },
  });
  console.log('✅ Seeded Driver Jashim and his Tesla "Bullet" (3 seats)');

  // 3. Seed Passengers: Nusrat, Rafiq, Shirin
  const passengers = [
    { name: 'Nusrat', email: 'nusrat@tesla.pool', balance: 100000 }, // 1000 BDT
    { name: 'Rafiq', email: 'rafiq@tesla.pool', balance: 100000 },
    { name: 'Shirin', email: 'shirin@tesla.pool', balance: 100000 },
  ];

  for (const p of passengers) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name, role: UserRole.PASSENGER },
      create: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: UserRole.PASSENGER,
        walletBalancePaisa: p.balance,
      },
    });
  }
  console.log(`✅ Seeded ${passengers.length} Passengers: Nusrat, Rafiq, Shirin`);

  console.log('🎉 Seed complete! Demo credentials: password123 for all users');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
