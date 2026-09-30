const { execSync } = require('child_process');

console.log('🚀 [Dhaka Tesla Pool] Running Vercel Build Pipeline...');

function run(cmd, desc, extraEnv = {}) {
  console.log(`\n▶ ${desc}`);
  try {
    const env = { ...process.env, ...extraEnv };
    execSync(cmd, { stdio: 'inherit', env });
    return true;
  } catch (err) {
    console.error(`❌ Error during ${desc}:`, err.message);
    return false;
  }
}

// 1. Generate Prisma Client
run('npx prisma generate --schema=apps/api/prisma/schema.prisma', 'Generating Prisma Client');

// 2. If DATABASE_URL is present (e.g. Neon Postgres on Vercel), auto-migrate and seed
if (process.env.DATABASE_URL) {
  console.log('\n🐘 Neon Postgres DATABASE_URL detected.');
  
  // Try migrate deploy first; if not applicable, fall back to db push
  const migrated = run(
    'npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma',
    'Applying Prisma Migrations to Neon Postgres'
  );

  if (!migrated) {
    run(
      'npx prisma db push --schema=apps/api/prisma/schema.prisma --accept-data-loss',
      'Pushing Prisma Schema directly to Neon Postgres'
    );
  }

  // Seed default 12 Dhaka areas and test users (Jashim, Nusrat, Rafiq, Shirin)
  run('npx tsx apps/api/prisma/seed.ts', 'Seeding Dhaka zones & demo accounts');
} else {
  console.log('\nℹ️ No DATABASE_URL provided at build time. Database migration skipped (will run on first connect).');
}

// 3. Build Next.js Web Application
// Next.js build strictly requires NODE_ENV='production' for static prerendering
const built = run('npm run build:web', 'Building Next.js Web Application', {
  NODE_ENV: 'production',
});

if (!built) {
  process.exit(1);
}

console.log('\n✨ [Dhaka Tesla Pool] Build pipeline completed successfully!\n');
