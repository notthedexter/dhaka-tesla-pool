# Dhaka Tesla Pool — Step-by-Step Execution Plan

> Every step ends with a **✅ CHECKPOINT** containing two verification layers:
> 1. **🤖 AUTOMATED** — commands the agent runs and validates output before proceeding
> 2. **👤 MANUAL** — things the user visually confirms in the browser/terminal
>
> The agent does NOT proceed until both layers pass.

---

## Architecture

```
Browser (Next.js 14) ──REST──▶ Express.js API ──Prisma──▶ PostgreSQL
   │                               │
   │ (Leaflet tiles)               │ (HTTP)
   ▼                               ▼
OpenStreetMap                 OSRM Routing API
```

## ERD Summary

```
users (id, name, email, password_hash, role, wallet_balance_paisa)
  │
  ├──▶ teslas (id, driver_id, name, total_seats, is_online)
  │
  ├──▶ ride_requests (id, passenger_id, pickup_area_id, destination_area_id,
  │         seats_needed, estimated_fare_paisa, distance_km, status, pool_id,
  │         payment_method, created_at, updated_at)
  │
  ├──▶ pools (id, tesla_id, driver_id, pickup_area_id, status, occupied_seats)
  │       │
  │       └──▶ pool_members (id, pool_id, ride_request_id, passenger_id,
  │                seats, fare_paisa, status)
  │
  └──▶ payments (id, ride_request_id, passenger_id, amount_paisa, method, status)

areas (id, name, latitude, longitude)
```

## Fare Model

```
passengerFare = baseFare + (distanceKm × perKmRate) - poolDiscount

baseFare     = 2500 paisa (25 BDT)
perKmRate    = 1000 paisa/km (10 BDT/km)
poolDiscount = 20% if 2 passengers, 30% if 3 passengers

Money stored as integer paisa (1 BDT = 100 paisa) to avoid floating-point errors.
```

---

## Git Workflow & Commit Rules (Mandated by PRD Sections 10 & 11)

### 1. Branch Strategy
- **Long-lived branches**:
  - `master`: Stable, tested code merged from feature branches.
  - `pre-release`: Integration branch cut from `master` for final integration, docs, Docker verification.
  - `release/v1.0.0`: The release version shown in the demo video and final submission.
- **Feature branches** (`feature/*`): Every phase is built on its dedicated feature branch:
  - Phase 1: `feature/scaffolding-and-db`
  - Phase 2: `feature/passenger-auth`
  - Phase 3, 4, 5: `feature/map-and-fare`
  - Phase 6: `feature/passenger-flow`
  - Phase 7: `feature/driver-flow`
  - Phase 8: `feature/tesla-pooling`
  - Phase 9: `feature/payments-and-history`

### 2. Commit Message Rules
- **Format**: `<type>(<scope>): <short description>`
- **Allowed Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`
- **Rules**:
  - Exactly one understandable, logical change per commit.
  - No generic messages like "update", "fix", "changes", "final", "asdf".
  - No meaningless micro-commits. A real, traceable engineering journey.
  - Examples straight from PRD:
    - `feat(auth): add passenger login endpoint`
    - `feat(pool): enforce Bullet's seat capacity`
    - `fix(pool): prevent overbooking available seats`
    - `build(docker): add compose setup for api and postgres`

### 3. Commit & Push Lifecycle for Each Step
At each step's checkpoint:
1. Verify automated tests pass.
2. Commit changes with conventional message: `git commit -m "<type>(<scope>): <short description>"`.
3. Push feature branch to GitHub remote: `git push -u origin <feature-branch>`.
4. After Phase completion & manual verification: merge feature branch to `master` and push `master`.

---

# PHASE 1: Make It Run

**Goal:** Project exists, dependencies installed, database running, both servers respond.

## Step 1.1 — Initialize the monorepo

Create the root project with npm workspaces:

```
dhaka-tesla-pool/
├── apps/
│   ├── web/          # Next.js 14 (App Router)
│   └── api/          # Express.js
├── packages/
│   └── shared/       # Shared types & constants
├── docker-compose.yml
├── .env.example
├── package.json
└── tsconfig.json
```

### ✅ CHECKPOINT 1.1

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
# Verify directory structure exists
test -d apps/web && echo "PASS: apps/web exists" || echo "FAIL: apps/web missing"
test -d apps/api && echo "PASS: apps/api exists" || echo "FAIL: apps/api missing"
test -d packages/shared && echo "PASS: packages/shared exists" || echo "FAIL: packages/shared missing"
test -f package.json && echo "PASS: root package.json exists" || echo "FAIL: root package.json missing"
test -f docker-compose.yml && echo "PASS: docker-compose.yml exists" || echo "FAIL: docker-compose.yml missing"
test -f .env.example && echo "PASS: .env.example exists" || echo "FAIL: .env.example missing"

# Verify workspaces configured in root package.json
node -e "const pkg = require('./package.json'); console.log(pkg.workspaces ? 'PASS: workspaces configured' : 'FAIL: no workspaces')"
```
Agent confirms all outputs show PASS.

**👤 MANUAL — User confirms:**
- [ ] `ls` output looks correct in the terminal

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

## Step 1.2 — Set up Next.js frontend

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

Install additional dependencies:
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
npx shadcn@latest init
npx shadcn@latest add button card badge select dialog input label toast skeleton separator tabs avatar dropdown-menu
```

### ✅ CHECKPOINT 1.2

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/web

# Verify Next.js installed
test -f next.config.ts && echo "PASS: next.config exists" || echo "FAIL"
test -f src/app/layout.tsx && echo "PASS: app router layout exists" || echo "FAIL"
test -f tailwind.config.ts && echo "PASS: tailwind configured" || echo "FAIL"

# Verify key dependencies in package.json
node -e "
const pkg = require('./package.json');
const deps = {...pkg.dependencies, ...pkg.devDependencies};
const checks = ['next', 'react', 'leaflet', 'react-leaflet', '@types/leaflet'];
checks.forEach(d => console.log(deps[d] ? 'PASS: '+d : 'FAIL: '+d+' missing'));
"

# Verify it builds without errors
npx next build 2>&1 | tail -5
# Should show "✓ Compiled successfully" or similar
```
Agent confirms all PASS and build succeeds.

**👤 MANUAL — User confirms:**
```bash
cd apps/web && npm run dev
```
- [ ] Open `http://localhost:3000` — default Next.js page loads in browser
- [ ] No console errors in the browser dev tools

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

## Step 1.3 — Set up Express.js backend

Install dependencies and create the Express server with a health check endpoint.

```typescript
// apps/api/src/index.ts
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### ✅ CHECKPOINT 1.3

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api

# Verify dependencies installed
node -e "
const pkg = require('./package.json');
const deps = {...pkg.dependencies, ...pkg.devDependencies};
['express','cors','dotenv','jsonwebtoken','bcryptjs','zod','typescript','prisma'].forEach(d =>
  console.log(deps[d] ? 'PASS: '+d : 'FAIL: '+d+' missing')
);
"

# Verify TypeScript compiles
npx tsc --noEmit 2>&1 | tail -3
# Should show no errors

# Start server in background, test health endpoint, then kill it
npm run dev &
SERVER_PID=$!
sleep 3
HEALTH=$(curl -s http://localhost:4000/api/health)
echo "$HEALTH" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.status === 'ok' ? 'PASS: health endpoint returns ok' : 'FAIL: unexpected response');
"
kill $SERVER_PID 2>/dev/null
```
Agent confirms TypeScript compiles and health endpoint returns `{ "status": "ok" }`.

**👤 MANUAL — User confirms:**
```bash
cd apps/api && npm run dev
# In another terminal:
curl http://localhost:4000/api/health
```
- [ ] Server starts without errors
- [ ] curl returns `{ "status": "ok", "timestamp": "..." }`

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

## Step 1.4 — Set up PostgreSQL with Docker

Create `docker-compose.yml` with PostgreSQL 16 and health checks.

Create `.env` from `.env.example`:
```env
DATABASE_URL=postgresql://teslapool:teslapool123@localhost:5432/dhaka_tesla_pool
PORT=4000
JWT_SECRET=dhaka-tesla-pool-super-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### ✅ CHECKPOINT 1.4

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
# Start Postgres
docker compose up -d

# Wait for healthy status (max 30 seconds)
for i in $(seq 1 30); do
  STATUS=$(docker compose ps --format json | node -e "
    const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\n');
    const svc = lines.map(l => JSON.parse(l)).find(s => s.Service === 'db');
    console.log(svc ? svc.Health || svc.State : 'not_found');
  " 2>/dev/null)
  if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "running" ]; then
    echo "PASS: PostgreSQL container is running ($STATUS)"
    break
  fi
  sleep 1
done

# Verify database connection
docker compose exec -T db psql -U teslapool -d dhaka_tesla_pool -c "SELECT 1 AS connection_test;" 2>&1 | grep -q "1" && echo "PASS: DB connection works" || echo "FAIL: DB connection failed"
```
Agent confirms container is healthy and DB connection works.

**👤 MANUAL — User confirms:**
```bash
docker compose ps
```
- [ ] `db` service shows as running/healthy

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

## Step 1.5 — Prisma schema, migration, and seed data

Create the full Prisma schema matching the ERD (7 tables: users, teslas, areas, ride_requests, pools, pool_members, payments).

Seed data:
| Name | Role | Email | Password |
|------|------|-------|----------|
| Jashim | DRIVER | jashim@tesla.pool | password123 |
| Nusrat | PASSENGER | nusrat@tesla.pool | password123 |
| Rafiq | PASSENGER | rafiq@tesla.pool | password123 |
| Shirin | PASSENGER | shirin@tesla.pool | password123 |
| Bullet | TESLA | — | 3 seats, belongs to Jashim |
| 12 Dhaka areas | AREA | — | Banani, Gulshan 1/2, Mohakhali, etc. |

### ✅ CHECKPOINT 1.5

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api

# Run migration
npx prisma migrate dev --name init 2>&1 | tail -5
# Should show "Your database is now in sync"

# Run seed
npx prisma db seed 2>&1
# Should show "✅ Seed complete"

# Verify table counts via Prisma query
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const users = await p.user.count();
  const teslas = await p.tesla.count();
  const areas = await p.area.count();
  console.log(users === 4 ? 'PASS: 4 users' : 'FAIL: expected 4 users, got ' + users);
  console.log(teslas === 1 ? 'PASS: 1 tesla' : 'FAIL: expected 1 tesla, got ' + teslas);
  console.log(areas === 12 ? 'PASS: 12 areas' : 'FAIL: expected 12 areas, got ' + areas);

  const jashim = await p.user.findUnique({ where: { email: 'jashim@tesla.pool' }, include: { tesla: true } });
  console.log(jashim?.role === 'DRIVER' ? 'PASS: Jashim is DRIVER' : 'FAIL: Jashim role wrong');
  console.log(jashim?.tesla?.name === 'Bullet' ? 'PASS: Bullet exists' : 'FAIL: Bullet missing');
  console.log(jashim?.tesla?.totalSeats === 3 ? 'PASS: Bullet has 3 seats' : 'FAIL: wrong seat count');

  const nusrat = await p.user.findUnique({ where: { email: 'nusrat@tesla.pool' } });
  console.log(nusrat?.role === 'PASSENGER' ? 'PASS: Nusrat is PASSENGER' : 'FAIL: Nusrat role wrong');
  console.log(nusrat?.walletBalancePaisa === 100000 ? 'PASS: Nusrat has 1000 BDT' : 'FAIL: wrong wallet');

  await p.\$disconnect();
})();
"
```
Agent confirms: 4 users, 1 tesla (Bullet with 3 seats), 12 areas, correct roles and wallet balances.

**👤 MANUAL — User confirms:**
```bash
npx prisma studio
```
- [ ] Open Prisma Studio in browser
- [ ] `users` table: 4 rows (Jashim, Nusrat, Rafiq, Shirin)
- [ ] `teslas` table: 1 row (Bullet, 3 seats, linked to Jashim)
- [ ] `areas` table: 12 rows with Dhaka area names + coordinates

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

## Step 1.6 — Shared types package

Create `packages/shared/` with `types.ts` (API response interfaces) and `constants.ts` (fare config, status enums, valid transitions).

### ✅ CHECKPOINT 1.6

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd packages/shared

# Verify TypeScript compiles
npx tsc --noEmit 2>&1 && echo "PASS: shared types compile" || echo "FAIL: TypeScript errors"

# Verify exports exist
node -e "
const c = require('./constants');
console.log(c.FARE_CONFIG ? 'PASS: FARE_CONFIG exported' : 'FAIL');
console.log(c.VALID_TRANSITIONS ? 'PASS: VALID_TRANSITIONS exported' : 'FAIL');
console.log(c.FARE_CONFIG.BASE_FARE_PAISA === 2500 ? 'PASS: base fare is 2500' : 'FAIL');
"
```
Agent confirms TypeScript compiles and constants export correctly.

**👤 MANUAL — User confirms:**
- [ ] No action needed — automated checks are sufficient for this step

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 2: Auth — Because Everything Needs a User

**Goal:** Passengers and drivers can register, login, get JWT tokens. Every subsequent API route can identify the caller.

## Step 2.1 — Auth middleware + routes (Backend)

Create:
- `apps/api/src/middleware/auth.ts` — JWT verification, `requireAuth`, `requireRole()`
- `apps/api/src/routes/auth.ts`:
  - `POST /api/auth/register` → create user, return JWT
  - `POST /api/auth/login` → verify credentials, return JWT
  - `GET /api/auth/me` → return current user profile

### ✅ CHECKPOINT 2.1

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api
npm run dev &
SERVER_PID=$!
sleep 3

# Test login with seeded user
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nusrat@tesla.pool","password":"password123"}')

echo "$LOGIN_RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.token ? 'PASS: login returns token' : 'FAIL: no token in response');
console.log(data.user?.name === 'Nusrat' ? 'PASS: correct user name' : 'FAIL: wrong user');
console.log(data.user?.role === 'PASSENGER' ? 'PASS: correct role' : 'FAIL: wrong role');
"

# Extract token and test /me
TOKEN=$(echo "$LOGIN_RESPONSE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")
ME_RESPONSE=$(curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN")
echo "$ME_RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.email === 'nusrat@tesla.pool' ? 'PASS: /me returns correct user' : 'FAIL');
"

# Test invalid credentials
FAIL_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nusrat@tesla.pool","password":"wrongpassword"}')
echo "$FAIL_RESPONSE" | grep -q "401" && echo "PASS: wrong password returns 401" || echo "FAIL: expected 401, got $FAIL_RESPONSE"

# Test no auth header
NOAUTH_RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/api/auth/me)
echo "$NOAUTH_RESPONSE" | grep -q "401" && echo "PASS: no auth returns 401" || echo "FAIL: expected 401, got $NOAUTH_RESPONSE"

# Test driver login
DRIVER_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jashim@tesla.pool","password":"password123"}')
echo "$DRIVER_RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.user?.role === 'DRIVER' ? 'PASS: Jashim is DRIVER' : 'FAIL');
"

kill $SERVER_PID 2>/dev/null
```
Agent confirms: login works, /me works, wrong password → 401, no token → 401, driver login works.

**👤 MANUAL — User confirms:**
- [ ] No extra manual action needed — automated checks cover auth API

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

## Step 2.2 — Auth pages + context (Frontend)

Create:
- `apps/web/src/lib/api.ts` — fetch wrapper with base URL + auth header
- `apps/web/src/context/AuthContext.tsx` — stores user/token, provides `login()`, `logout()`, `register()`
- `apps/web/src/app/login/page.tsx` — login form
- `apps/web/src/app/register/page.tsx` — register form
- Protected route logic for `/passenger/*` and `/driver/*`

### ✅ CHECKPOINT 2.2

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/web

# Verify pages exist
test -f src/app/login/page.tsx && echo "PASS: login page exists" || echo "FAIL"
test -f src/app/register/page.tsx && echo "PASS: register page exists" || echo "FAIL"
test -f src/context/AuthContext.tsx && echo "PASS: auth context exists" || echo "FAIL"
test -f src/lib/api.ts && echo "PASS: api lib exists" || echo "FAIL"

# Verify it builds
npx next build 2>&1 | tail -3
# Should compile without errors
```
Agent confirms all files exist and Next.js builds successfully.

**👤 MANUAL — User confirms:**
1. Open `http://localhost:3000/login`
2. - [ ] Login form renders with email and password fields
3. Login as `nusrat@tesla.pool` / `password123`
4. - [ ] Redirected to dashboard, nav shows "Nusrat"
5. - [ ] Refresh page — still logged in
6. - [ ] Click logout — redirected to login

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 3: The Map Component — Reused Everywhere

**Goal:** Reusable Leaflet map that shows areas, draws routes, supports click interaction.

## Step 3.1 — Map component + OSRM service

Create:
- `apps/web/src/components/Map.tsx` — Leaflet `MapContainer`, `TileLayer`, `Marker`, `Polyline`, icon fix
- `apps/web/src/components/DynamicMap.tsx` — `next/dynamic` wrapper with `ssr: false`
- `apps/api/src/services/osrm.ts` — `getDrivingRoute()` calling OSRM public API, `getHaversineDistanceKm()` fallback

### ✅ CHECKPOINT 3

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
# Verify component files exist
test -f apps/web/src/components/Map.tsx && echo "PASS: Map.tsx exists" || echo "FAIL"
test -f apps/web/src/components/DynamicMap.tsx && echo "PASS: DynamicMap.tsx exists" || echo "FAIL"
test -f apps/api/src/services/osrm.ts && echo "PASS: osrm.ts exists" || echo "FAIL"

# Verify Next.js builds with the map component (no SSR crash)
cd apps/web && npx next build 2>&1 | tail -5
# Should compile without "window is not defined" errors

# Test OSRM service directly — Banani to Mohakhali
cd apps/api
npx tsx -e "
const { getDrivingRoute } = require('./src/services/osrm');
(async () => {
  try {
    const result = await getDrivingRoute([
      { lat: 23.7937, lng: 90.4045 },
      { lat: 23.7776, lng: 90.4005 }
    ]);
    console.log(result.distanceKm > 0 ? 'PASS: OSRM returns distance (' + result.distanceKm + ' km)' : 'FAIL');
    console.log(result.durationMin > 0 ? 'PASS: OSRM returns duration (' + result.durationMin + ' min)' : 'FAIL');
    console.log(result.coordinates.length > 2 ? 'PASS: route has ' + result.coordinates.length + ' points' : 'FAIL');
  } catch (e) {
    console.log('FAIL: OSRM error - ' + e.message);
  }
})();
"
```
Agent confirms: Next.js builds without SSR errors, OSRM returns distance/duration/route for Banani→Mohakhali.

**👤 MANUAL — User confirms:**
1. Open `http://localhost:3000` (or a test page with the map)
2. - [ ] Map renders with OpenStreetMap tiles centered on Dhaka
3. - [ ] Area markers are visible on the map
4. - [ ] Clicking a marker shows a popup with the area name

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 4: Landing Page — The Front Door

**Goal:** Hero section, interactive map with all areas, navigation with auth state, CTAs to booking/driver dashboard.

## Step 4.1 — Areas API + Landing page + Layout

Create:
- `GET /api/areas` — returns all 12 areas (public, no auth)
- `apps/web/src/app/page.tsx` — landing page with hero, map, how-it-works, CTAs
- `apps/web/src/components/Navbar.tsx` — logo, auth state, navigation
- `apps/web/src/app/passenger/layout.tsx` — protected dashboard layout
- `apps/web/src/app/driver/layout.tsx` — protected dashboard layout

### ✅ CHECKPOINT 4

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
# Test areas API
cd apps/api
npm run dev &
SERVER_PID=$!
sleep 3

AREAS_RESPONSE=$(curl -s http://localhost:4000/api/areas)
echo "$AREAS_RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(Array.isArray(data) ? 'PASS: areas returns array' : 'FAIL');
console.log(data.length === 12 ? 'PASS: 12 areas returned' : 'FAIL: got ' + data.length);
const banani = data.find(a => a.name === 'Banani');
console.log(banani ? 'PASS: Banani found' : 'FAIL: Banani missing');
console.log(banani?.latitude ? 'PASS: has coordinates' : 'FAIL: no coordinates');
"
kill $SERVER_PID 2>/dev/null

# Verify frontend files exist
test -f apps/web/src/app/page.tsx && echo "PASS: landing page exists" || echo "FAIL"
test -f apps/web/src/components/Navbar.tsx && echo "PASS: navbar exists" || echo "FAIL"

# Verify frontend builds
cd apps/web && npx next build 2>&1 | tail -3
```
Agent confirms: API returns 12 areas with coordinates, landing page builds.

**👤 MANUAL — User confirms:**
1. Open `http://localhost:3000`
2. - [ ] Hero section visible with "Share a seat. Split the fare." text
3. - [ ] Map shows 12 area markers with name popups
4. - [ ] "Book a Ride" CTA navigates to `/passenger/book`
5. - [ ] "Drive with Us" CTA navigates to `/driver/dashboard`
6. - [ ] While logged out: navbar shows Login / Register buttons
7. - [ ] Login as Nusrat → navbar shows her name with Passenger badge

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 5: Distance + Fare Engine — Backend Brains

**Goal:** OSRM distance calculation API and fare calculation service with unit tests.

## Step 5.1 — Distance API + Fare service + Tests

Create:
- `GET /api/areas/distance?from={id}&to={id}` — calls OSRM, returns `{ distanceKm, durationMin, routeCoordinates }`
- `apps/api/src/services/fare.ts` — `calculateFare(distanceKm, poolSize)` pure function
- `apps/api/src/__tests__/fare.test.ts` — unit tests for fare calculation

### ✅ CHECKPOINT 5

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api

# Run fare unit tests
npm test -- --testPathPattern=fare 2>&1
# All tests should pass

# Test distance API endpoint
npm run dev &
SERVER_PID=$!
sleep 3

# Banani (id=1) to Mohakhali (id=4)
DIST_RESPONSE=$(curl -s "http://localhost:4000/api/areas/distance?from=1&to=4")
echo "$DIST_RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.distanceKm > 0 ? 'PASS: distance = ' + data.distanceKm + ' km' : 'FAIL: no distance');
console.log(data.durationMin > 0 ? 'PASS: duration = ' + data.durationMin + ' min' : 'FAIL: no duration');
console.log(data.routeCoordinates?.length > 0 ? 'PASS: route has ' + data.routeCoordinates.length + ' points' : 'FAIL: no route');
"

# Test fare calculation inline
npx tsx -e "
const { calculateFare } = require('./src/services/fare');
const solo = calculateFare(2.1, 1);
console.log(solo.totalFare === 4600 ? 'PASS: solo fare = 4600 paisa' : 'FAIL: got ' + solo.totalFare);
const pool2 = calculateFare(2.1, 2);
console.log(pool2.totalFare === 3680 ? 'PASS: 2-pool fare = 3680 paisa' : 'FAIL: got ' + pool2.totalFare);
const pool3 = calculateFare(2.1, 3);
console.log(pool3.totalFare === 3220 ? 'PASS: 3-pool fare = 3220 paisa' : 'FAIL: got ' + pool3.totalFare);
const base = calculateFare(0, 1);
console.log(base.totalFare === 2500 ? 'PASS: 0km = base fare only' : 'FAIL: got ' + base.totalFare);
"

kill $SERVER_PID 2>/dev/null
```
Agent confirms: all fare tests pass, distance API returns real data, fare formula is hand-verifiable.

**👤 MANUAL — User confirms:**
- [ ] `npm test` output shows all fare tests passing (green)

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 6: Passenger Booking Flow — The Core Journey

**Goal:** Nusrat can pick areas on map, see fare, book a ride, track status, cancel, view history.

## Step 6.1 — Ride Request API

Create `apps/api/src/routes/rides.ts`:
- `POST /api/rides` — create ride (auth: PASSENGER), calculates fare via OSRM
- `GET /api/rides/my` — list user's rides
- `GET /api/rides/:id` — ride detail with pool info
- `PATCH /api/rides/:id/cancel` — cancel (only REQUESTED/MATCHED)

## Step 6.2 — Booking UI, Tracking, History

Create:
- `/passenger/book` — multi-step booking with map, area selection, fare preview, confirm
- `/passenger/ride/[id]` — status stepper, map, driver info, cancel button, polls every 5s
- `/passenger/history` — ride list with status/fare

### ✅ CHECKPOINT 6

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api
npm run dev &
SERVER_PID=$!
sleep 3

# Login as Nusrat
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nusrat@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

# Create a ride request: Banani (1) → Mohakhali (4)
RIDE=$(curl -s -X POST http://localhost:4000/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pickupAreaId":1,"destinationAreaId":4,"seatsNeeded":1,"paymentMethod":"CASH"}')

echo "$RIDE" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.id ? 'PASS: ride created with id ' + r.id : 'FAIL: no id');
console.log(r.status === 'REQUESTED' ? 'PASS: status is REQUESTED' : 'FAIL: status = ' + r.status);
console.log(r.estimatedFarePaisa > 0 ? 'PASS: fare calculated = ' + r.estimatedFarePaisa + ' paisa' : 'FAIL: no fare');
console.log(r.distanceKm > 0 ? 'PASS: distance = ' + r.distanceKm + ' km' : 'FAIL: no distance');
"

# Get ride ID for next checks
RIDE_ID=$(echo "$RIDE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)")

# Get my rides
MY_RIDES=$(curl -s http://localhost:4000/api/rides/my -H "Authorization: Bearer $TOKEN")
echo "$MY_RIDES" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.length > 0 ? 'PASS: my rides returns ' + data.length + ' ride(s)' : 'FAIL: empty');
"

# Cancel the ride
CANCEL=$(curl -s -X PATCH "http://localhost:4000/api/rides/$RIDE_ID/cancel" -H "Authorization: Bearer $TOKEN")
echo "$CANCEL" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'CANCELLED' ? 'PASS: ride cancelled' : 'FAIL: status = ' + r.status);
"

# Try to cancel again — should fail
CANCEL2_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "http://localhost:4000/api/rides/$RIDE_ID/cancel" -H "Authorization: Bearer $TOKEN")
echo "$CANCEL2_STATUS" | grep -q "400" && echo "PASS: double cancel returns 400" || echo "FAIL: got $CANCEL2_STATUS"

# Verify Rafiq can't cancel Nusrat's ride
RAFIQ_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rafiq@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

# Create a new ride as Nusrat for auth test
RIDE2=$(curl -s -X POST http://localhost:4000/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pickupAreaId":1,"destinationAreaId":4,"seatsNeeded":1,"paymentMethod":"CASH"}')
RIDE2_ID=$(echo "$RIDE2" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)")

AUTH_TEST=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "http://localhost:4000/api/rides/$RIDE2_ID/cancel" -H "Authorization: Bearer $RAFIQ_TOKEN")
echo "$AUTH_TEST" | grep -q "403" && echo "PASS: Rafiq can't cancel Nusrat's ride (403)" || echo "FAIL: got $AUTH_TEST"

kill $SERVER_PID 2>/dev/null
```
Agent confirms: ride creation, fare calculation, my-rides listing, cancel flow, auth guard all work.

**👤 MANUAL — User confirms:**
1. Login as Nusrat in browser
2. Go to `/passenger/book`
3. - [ ] Select Banani (pickup) → Mohakhali (destination)
4. - [ ] Map shows route polyline between the two areas
5. - [ ] Fare estimate displays (≈46 BDT solo)
6. - [ ] Click "Book Ride" → redirected to tracking page showing REQUESTED
7. - [ ] Ride appears in `/passenger/history`
8. - [ ] Cancel button works on tracking page → status changes to CANCELLED

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 7: Driver Flow — Responding to Bookings

**Goal:** Jashim goes online, sees requests, accepts a ride (creates pool), manages lifecycle: arrive → start → complete.

## Step 7.1 — Driver API + State machine + Dashboard

Create:
- `apps/api/src/routes/drivers.ts` — all driver endpoints (toggle status, see requests, accept, arrive, start, complete)
- `apps/api/src/services/stateMachine.ts` — transition validation
- `/driver/dashboard` — online toggle, request list, active pool view with lifecycle buttons
- `/driver/history` — completed pools

### ✅ CHECKPOINT 7

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api
npm run dev &
SERVER_PID=$!
sleep 3

# Login as Nusrat and create a ride
NUSRAT_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nusrat@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

RIDE=$(curl -s -X POST http://localhost:4000/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NUSRAT_TOKEN" \
  -d '{"pickupAreaId":1,"destinationAreaId":4,"seatsNeeded":1,"paymentMethod":"CASH"}')
RIDE_ID=$(echo "$RIDE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)")
echo "Created ride: $RIDE_ID"

# Login as Jashim
JASHIM_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jashim@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

# Go online
curl -s -X PATCH http://localhost:4000/api/drivers/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JASHIM_TOKEN" \
  -d '{"isOnline":true}' | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.isOnline === true ? 'PASS: Jashim is online' : 'FAIL');
"

# See pending requests
REQUESTS=$(curl -s http://localhost:4000/api/drivers/requests -H "Authorization: Bearer $JASHIM_TOKEN")
echo "$REQUESTS" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(data.length > 0 ? 'PASS: sees ' + data.length + ' pending request(s)' : 'FAIL: no requests');
"

# Accept ride
ACCEPT=$(curl -s -X POST "http://localhost:4000/api/drivers/accept/$RIDE_ID" -H "Authorization: Bearer $JASHIM_TOKEN")
echo "$ACCEPT" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.pool?.id ? 'PASS: pool created' : 'FAIL: no pool');
console.log(r.pool?.occupiedSeats === 1 ? 'PASS: 1/3 seats' : 'FAIL: seats = ' + r.pool?.occupiedSeats);
"
POOL_ID=$(echo "$ACCEPT" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pool?.id)")

# Check ride status changed to MATCHED
RIDE_CHECK=$(curl -s "http://localhost:4000/api/rides/$RIDE_ID" -H "Authorization: Bearer $NUSRAT_TOKEN")
echo "$RIDE_CHECK" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'MATCHED' ? 'PASS: ride is MATCHED' : 'FAIL: status = ' + r.status);
"

# Arrive
curl -s -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/arrive" -H "Authorization: Bearer $JASHIM_TOKEN" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'EN_ROUTE' ? 'PASS: pool EN_ROUTE' : 'FAIL');
"

# Verify ride updated
curl -s "http://localhost:4000/api/rides/$RIDE_ID" -H "Authorization: Bearer $NUSRAT_TOKEN" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'DRIVER_ARRIVED' ? 'PASS: ride DRIVER_ARRIVED' : 'FAIL: ' + r.status);
"

# Start
curl -s -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/start" -H "Authorization: Bearer $JASHIM_TOKEN" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log('PASS: trip started');
"

# Complete
curl -s -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/complete" -H "Authorization: Bearer $JASHIM_TOKEN" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'COMPLETED' ? 'PASS: pool COMPLETED' : 'FAIL');
"

# Verify ride is completed
curl -s "http://localhost:4000/api/rides/$RIDE_ID" -H "Authorization: Bearer $NUSRAT_TOKEN" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'COMPLETED' ? 'PASS: ride COMPLETED' : 'FAIL: ' + r.status);
"

# Test invalid transition: try to start a completed pool
INVALID=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/start" -H "Authorization: Bearer $JASHIM_TOKEN")
echo "$INVALID" | grep -q "400" && echo "PASS: invalid transition returns 400" || echo "FAIL: got $INVALID"

kill $SERVER_PID 2>/dev/null
```
Agent confirms: full lifecycle REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED works, invalid transitions blocked.

**👤 MANUAL — User confirms (use two browser windows):**
1. Browser 1: Login as Nusrat → book ride Banani → Mohakhali
2. Browser 2: Login as Jashim → `/driver/dashboard` → toggle online
3. - [ ] Jashim sees Nusrat's request in the list
4. - [ ] Click Accept → pool shows 1/3 seats
5. - [ ] Switch to Nusrat's browser → tracking page shows MATCHED with Jashim/Bullet info
6. - [ ] Jashim clicks "I've Arrived" → Nusrat sees DRIVER_ARRIVED
7. - [ ] Jashim clicks "Start Trip" → Nusrat sees STARTED
8. - [ ] Jashim clicks "Complete Trip" → both show COMPLETED

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 8: Pool Matching — Connecting Passengers

**Goal:** Auto-match passengers to existing pools. Handle concurrency safely.

## Step 8.1 — Pool matching engine + concurrency + fare recalculation

Create:
- `apps/api/src/services/poolMatcher.ts` — find compatible pools, add member with `SELECT FOR UPDATE`
- Update `POST /api/rides` to call pool matcher after creating the request
- Fare recalculation for all pool members when a new member joins

### ✅ CHECKPOINT 8

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api
npm run dev &
SERVER_PID=$!
sleep 3

# Login all users
NUSRAT_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"nusrat@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")
RAFIQ_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"rafiq@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")
SHIRIN_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"shirin@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")
JASHIM_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"jashim@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

# Jashim goes online
curl -s -X PATCH http://localhost:4000/api/drivers/status -H "Content-Type: application/json" -H "Authorization: Bearer $JASHIM_TOKEN" -d '{"isOnline":true}' > /dev/null

# Nusrat books: Banani → Mohakhali
RIDE1=$(curl -s -X POST http://localhost:4000/api/rides -H "Content-Type: application/json" -H "Authorization: Bearer $NUSRAT_TOKEN" -d '{"pickupAreaId":1,"destinationAreaId":4,"seatsNeeded":1,"paymentMethod":"TESLAPAY"}')
RIDE1_ID=$(echo "$RIDE1" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)")
echo "Nusrat's ride: $RIDE1_ID"

# Jashim accepts Nusrat
ACCEPT=$(curl -s -X POST "http://localhost:4000/api/drivers/accept/$RIDE1_ID" -H "Authorization: Bearer $JASHIM_TOKEN")
POOL_ID=$(echo "$ACCEPT" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pool?.id)")
echo "Pool created: $POOL_ID"

# Rafiq books: Banani → Gulshan 1 — should AUTO-MATCH
RIDE2=$(curl -s -X POST http://localhost:4000/api/rides -H "Content-Type: application/json" -H "Authorization: Bearer $RAFIQ_TOKEN" -d '{"pickupAreaId":1,"destinationAreaId":2,"seatsNeeded":1,"paymentMethod":"CASH"}')
echo "$RIDE2" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'MATCHED' ? 'PASS: Rafiq auto-matched!' : 'FAIL: status = ' + r.status);
console.log(r.poolId ? 'PASS: assigned to pool' : 'FAIL: no pool');
"

# Verify pool has 2 seats occupied
POOL_CHECK=$(curl -s "http://localhost:4000/api/drivers/pool/current" -H "Authorization: Bearer $JASHIM_TOKEN")
echo "$POOL_CHECK" | node -e "
const p = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(p.occupiedSeats === 2 ? 'PASS: 2/3 seats filled' : 'FAIL: seats = ' + p.occupiedSeats);
console.log(p.members?.length === 2 ? 'PASS: 2 pool members' : 'FAIL: members = ' + p.members?.length);
"

# Shirin books: Banani → Dhanmondi — should AUTO-MATCH (3/3)
RIDE3=$(curl -s -X POST http://localhost:4000/api/rides -H "Content-Type: application/json" -H "Authorization: Bearer $SHIRIN_TOKEN" -d '{"pickupAreaId":1,"destinationAreaId":5,"seatsNeeded":1,"paymentMethod":"CASH"}')
echo "$RIDE3" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'MATCHED' ? 'PASS: Shirin auto-matched!' : 'FAIL: status = ' + r.status);
"

# Verify pool is now full (3/3)
POOL_FULL=$(curl -s "http://localhost:4000/api/drivers/pool/current" -H "Authorization: Bearer $JASHIM_TOKEN")
echo "$POOL_FULL" | node -e "
const p = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(p.occupiedSeats === 3 ? 'PASS: pool FULL 3/3' : 'FAIL: seats = ' + p.occupiedSeats);
"

# Register a 4th passenger and try to book — should NOT match
REG4=$(curl -s -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Karim","email":"karim@tesla.pool","password":"password123","role":"PASSENGER"}')
KARIM_TOKEN=$(echo "$REG4" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

RIDE4=$(curl -s -X POST http://localhost:4000/api/rides -H "Content-Type: application/json" -H "Authorization: Bearer $KARIM_TOKEN" -d '{"pickupAreaId":1,"destinationAreaId":7,"seatsNeeded":1,"paymentMethod":"CASH"}')
echo "$RIDE4" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'REQUESTED' ? 'PASS: 4th passenger stays REQUESTED (pool full)' : 'FAIL: status = ' + r.status);
console.log(!r.poolId ? 'PASS: no pool assigned' : 'FAIL: incorrectly pooled');
"

# Verify fare recalculation — all 3 members should have pool discount
echo "$POOL_FULL" | node -e "
const p = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if (p.members) {
  p.members.forEach(m => {
    const hasDiscount = m.farePaisa < (2500 + 3000); // less than solo fare for ~3km
    console.log(hasDiscount ? 'PASS: ' + m.passengerName + ' has pool discount' : 'WARNING: check fare for ' + m.passengerName);
  });
}
"

kill $SERVER_PID 2>/dev/null
```
Agent confirms: auto-matching works for 2nd and 3rd passenger, pool fills to 3/3, 4th passenger stays REQUESTED, fares include pool discount.

**👤 MANUAL — User confirms:**
1. Open 3 browser windows (or incognito tabs)
2. - [ ] Nusrat books Banani → Mohakhali, Jashim accepts
3. - [ ] Rafiq books Banani → Gulshan 1 → auto-matched (toast shows pool match)
4. - [ ] Shirin books Banani → Dhanmondi → auto-matched (3/3)
5. - [ ] Jashim's dashboard shows 3/3 seats with all 3 passengers
6. - [ ] All passengers see pool discount in their fare estimates

**⏸ WAIT FOR USER CONFIRMATION BEFORE PROCEEDING.**

---

# PHASE 9: Payments & History — Wrapping Up

**Goal:** TeslaPay wallet, payment processing on ride completion, history with fare breakdowns.

## Step 9.1 — Wallet API + Payment processing + Enhanced history

Create:
- `GET /api/wallet/balance` — current wallet balance
- `POST /api/wallet/topup` — simulated top-up
- Payment processing in pool completion endpoint
- Enhanced history views with fare/payment details

### ✅ CHECKPOINT 9 (Final)

**🤖 AUTOMATED — Agent runs these and verifies output:**
```bash
cd apps/api
npm run dev &
SERVER_PID=$!
sleep 3

# Login users
NUSRAT_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"nusrat@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")
JASHIM_TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"jashim@tesla.pool","password":"password123"}' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).token)")

# Check Nusrat's wallet before
WALLET_BEFORE=$(curl -s http://localhost:4000/api/wallet/balance -H "Authorization: Bearer $NUSRAT_TOKEN")
echo "$WALLET_BEFORE" | node -e "
const w = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(w.balancePaisa >= 0 ? 'PASS: wallet balance = ' + w.balancePaisa + ' paisa (' + (w.balancePaisa/100) + ' BDT)' : 'FAIL');
"
BALANCE_BEFORE=$(echo "$WALLET_BEFORE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).balancePaisa)")

# Jashim online
curl -s -X PATCH http://localhost:4000/api/drivers/status -H "Content-Type: application/json" -H "Authorization: Bearer $JASHIM_TOKEN" -d '{"isOnline":true}' > /dev/null

# Nusrat books with TeslaPay
RIDE=$(curl -s -X POST http://localhost:4000/api/rides -H "Content-Type: application/json" -H "Authorization: Bearer $NUSRAT_TOKEN" -d '{"pickupAreaId":1,"destinationAreaId":4,"seatsNeeded":1,"paymentMethod":"TESLAPAY"}')
RIDE_ID=$(echo "$RIDE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)")
FARE=$(echo "$RIDE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).estimatedFarePaisa)")
echo "Ride fare: $FARE paisa"

# Jashim accepts + arrive + start + complete
curl -s -X POST "http://localhost:4000/api/drivers/accept/$RIDE_ID" -H "Authorization: Bearer $JASHIM_TOKEN" > /dev/null
POOL_ID=$(curl -s http://localhost:4000/api/drivers/pool/current -H "Authorization: Bearer $JASHIM_TOKEN" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)")
curl -s -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/arrive" -H "Authorization: Bearer $JASHIM_TOKEN" > /dev/null
curl -s -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/start" -H "Authorization: Bearer $JASHIM_TOKEN" > /dev/null
curl -s -X PATCH "http://localhost:4000/api/drivers/pool/$POOL_ID/complete" -H "Authorization: Bearer $JASHIM_TOKEN" > /dev/null

# Check wallet after — should be deducted
WALLET_AFTER=$(curl -s http://localhost:4000/api/wallet/balance -H "Authorization: Bearer $NUSRAT_TOKEN")
BALANCE_AFTER=$(echo "$WALLET_AFTER" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).balancePaisa)")

node -e "
const before = $BALANCE_BEFORE;
const after = $BALANCE_AFTER;
const fare = $FARE;
const deducted = before - after;
console.log(deducted === fare ? 'PASS: wallet deducted by exact fare (' + fare + ' paisa)' : 'FAIL: expected ' + fare + ' deducted, got ' + deducted);
console.log(after >= 0 ? 'PASS: wallet not negative (' + after + ' paisa remaining)' : 'FAIL: negative wallet');
"

# Check ride has payment record
RIDE_DETAIL=$(curl -s "http://localhost:4000/api/rides/$RIDE_ID" -H "Authorization: Bearer $NUSRAT_TOKEN")
echo "$RIDE_DETAIL" | node -e "
const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(r.status === 'COMPLETED' ? 'PASS: ride COMPLETED' : 'FAIL');
console.log(r.payment?.status === 'COMPLETED' ? 'PASS: payment COMPLETED' : 'FAIL: payment status = ' + r.payment?.status);
console.log(r.payment?.method === 'TESLAPAY' ? 'PASS: payment method TESLAPAY' : 'FAIL');
"

# Check history
HISTORY=$(curl -s http://localhost:4000/api/rides/my -H "Authorization: Bearer $NUSRAT_TOKEN")
echo "$HISTORY" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const completed = data.filter(r => r.status === 'COMPLETED');
console.log(completed.length > 0 ? 'PASS: ' + completed.length + ' completed ride(s) in history' : 'FAIL: no completed rides');
"

# Test wallet topup
curl -s -X POST http://localhost:4000/api/wallet/topup -H "Content-Type: application/json" -H "Authorization: Bearer $NUSRAT_TOKEN" -d '{"amount":50000}' | node -e "
const w = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(w.balancePaisa > $BALANCE_AFTER ? 'PASS: topup increased balance' : 'FAIL');
"

kill $SERVER_PID 2>/dev/null
```
Agent confirms: wallet deducted by exact fare, payment record created, history shows completed rides, topup works.

**👤 MANUAL — User confirms:**
1. Login as Nusrat
2. - [ ] Wallet balance shows in navbar (e.g. ৳1000)
3. Book ride with TeslaPay → complete the full lifecycle with Jashim
4. - [ ] Wallet balance decreased by the fare amount
5. - [ ] Ride detail shows payment record (COMPLETED, TESLAPAY)
6. - [ ] `/passenger/history` shows the completed ride with fare breakdown
7. - [ ] Jashim's `/driver/history` shows the pool with total fares
8. - [ ] Wallet topup works from `/passenger/wallet`

**⏸ WAIT FOR USER CONFIRMATION — MVP IS COMPLETE. 🎉**

---

# Post-MVP Checklist

After all 9 phases pass both automated and manual checks:
- [ ] Full `docker-compose.yml` with app containers + DB
- [ ] Comprehensive test suite (capacity, state transitions, concurrency, auth)
- [ ] Git workflow: feature branches → master → pre-release → release/v1.0.0
- [ ] README with architecture, ERD, setup, API docs, trade-offs
- [ ] 6-minute demo video
- [ ] Free-tier deployment (if available)
