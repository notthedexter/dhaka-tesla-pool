# ⚡ Dhaka Tesla Pool (ঢাকা টেসলা পুল)

> **"Share a seat. Split the fare. Survive Dhaka traffic."**  
> An agentic, high-concurrency ride-pooling platform designed for shared electric 3-wheel mobility across Dhaka's bustling corridors.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

---

## 📖 The Story Cast

The application is modeled around the authentic Dhaka commuting journey outlined in the product requirements:

* **Jashim Uddin (The Pilot):** Driver of **"Bullet"**, a customized, battery-swapped 3-seat electric vehicle with a digital cockpit operating along the Banani–Mohakhali–Gulshan corridor.
* **Nusrat Jahan (Corporate Commuter):** Software engineer commuting from Banani Road 11 to Mohakhali Wireless Gate who demands predictable arrival times and cashless convenience.
* **Rafiq Ahmed (Student):** Tech enthusiast traveling from Banani to Gulshan 1 who splits the fare with Nusrat for 20% savings.
* **Shirin Akter (Healthcare Worker):** Nurse en route from Banani to Dhanmondi filling the 3rd seat in Bullet to maximize the 30% pooling discount.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│              Browser Client (Next.js 16)               │
│  - App Router, React 19, Tailwind CSS, Lucide Icons    │
│  - Dynamic Leaflet Maps (OSRM Routing, Custom Markers) │
│  - Real-time Polling & Live State Synchronization      │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (JWT Auth)
                            ▼
┌────────────────────────────────────────────────────────┐
│               API Server (Express.js)                  │
│  - Strict State Machine Transitions                    │
│  - Atomic Concurrency Pool Matcher                     │
│  - Pure Integer-Paisa Dynamic Fare Calculation Engine  │
└─────────────┬────────────────────────────┬─────────────┘
              │ Prisma ORM                 │ HTTP OSRM
              ▼                            ▼
┌────────────────────────────┐  ┌────────────────────────┐
│   PostgreSQL 16 Database   │  │   OpenStreetMap API    │
│  - 7 Relational Tables     │  │   - Public OSRM Router │
│  - Atomic Transactions     │  │   - Haversine Fallback │
└────────────────────────────┘  └────────────────────────┘
```

---

## 📊 Database Schema (ERD)

```
┌──────────────┐       ┌──────────────┐       ┌─────────────────┐
│    users     │───1:1─│   teslas     │───1:N─│      pools      │
│──────────────│       │──────────────│       │─────────────────│
│ id (PK)      │       │ id (PK)      │       │ id (PK)         │
│ name         │       │ driverId(FK) │       │ teslaId (FK)    │
│ email        │       │ name         │       │ driverId (FK)   │
│ passwordHash │       │ totalSeats(3)│       │ pickupAreaId(FK)│
│ role         │       │ isOnline     │       │ status          │
│ walletPaisa  │       └──────────────┘       │ occupiedSeats   │
└──────┬───────┘                              └────────┬────────┘
       │                                               │
       │ 1:N                                       1:N │
       ▼                                               ▼
┌───────────────────────────┐                 ┌─────────────────┐
│       ride_requests       │◀──────1:1───────│  pool_members   │
│───────────────────────────│                 │─────────────────│
│ id (PK)                   │                 │ id (PK)         │
│ passengerId (FK)          │                 │ poolId (FK)     │
│ pickupAreaId (FK)         │                 │ rideRequestIdFK │
│ destinationAreaId (FK)    │                 │ passengerId (FK)│
│ seatsNeeded               │                 │ seats           │
│ estimatedFarePaisa        │                 │ farePaisa       │
│ distanceKm                │                 │ status          │
│ status                    │                 └─────────────────┘
│ poolId (FK)               │
│ paymentMethod             │                 ┌─────────────────┐
└─────────────┬─────────────┘                 │      areas      │
              │                               │─────────────────│
              │ 1:1                           │ id (PK)         │
              ▼                               │ name            │
┌───────────────────────────┐                 │ latitude        │
│         payments          │                 │ longitude       │
│───────────────────────────│                 └─────────────────┘
│ id (PK)                   │
│ rideRequestId (FK)        │
│ passengerId (FK)          │
│ amountPaisa               │
│ method (CASH/TESLAPAY)    │
│ status                    │
└───────────────────────────┘
```

---

## 🧮 Fare Calculation Engine

All currency values are stored as **integer paisa** (1 BDT = 100 paisa) to eliminate IEEE 754 floating-point rounding errors.

$$\text{passengerFare} = \text{baseFare} + (\text{distanceKm} \times \text{perKmRate}) - \text{poolDiscount}$$

* **Base Fare**: `25.00 BDT` (2,500 paisa)
* **Per Kilometer Rate**: `10.00 BDT/km` (1,000 paisa/km)
* **Pooling Discount**:
  * 1 Passenger (Solo): `0%`
  * 2 Passengers (Pooled): `20%` discount on total fare
  * 3 Passengers (Full Pool): `30%` discount on total fare

---

## 🚀 Key Features

### 1. Dynamic Auto-Pool Matching
* Passengers booking from the same hub are automatically matched with active Teslas.
* Concurrency protection prevents exceeding Bullet's 3-passenger capacity.
* Fares dynamically adjust for all onboard riders as new passengers join or cancel.

### 2. Advance Queued Trip (Max 1 Advance Limit)
* When a driver is actively running a trip, they can accept **at most 1 advance trip** for their queue.
* Drivers cannot overbook their queue; additional requests are blocked.
* The driver's dashboard features a distinct **Awaiting / Advance Trip** card displaying queued riders and destination hubs.
* Once the current trip completes, the advance trip automatically promotes to the active cockpit ride.

### 3. Passenger Awaiting Time Estimate
* Passengers whose driver is completing a prior trip receive an **Advance Trip Queued** notice.
* Live estimated wait time (e.g. `~11 mins estimated wait`) calculated from the driver's current dropoff distance.

### 4. Gated Trip Lifecycle
* The driver must depart and mark **"Depart & Start Trip (All Onboard)"** before trip completion becomes possible.
* Premature completion is blocked both on the backend state machine and the UI.

### 5. TeslaPay Digital Mobility Wallet
* Contactless, cashless payments with instant balance deduction on dropoff.
* Integrated wallet top-up interface (`/passenger/wallet`) and ledger history.

---

## 📁 Monorepo Structure

```
dhaka-tesla-pool/
├── apps/
│   ├── api/                   # Express.js REST API with Prisma ORM
│   │   ├── prisma/            # Schema, migrations & seed data
│   │   ├── src/
│   │   │   ├── routes/        # auth, areas, rides, drivers, wallet
│   │   │   ├── services/      # osrm, fare, stateMachine, poolMatcher
│   │   │   └── middleware/    # JWT auth & role guards
│   │   └── Dockerfile
│   └── web/                   # Next.js 16 (App Router) Frontend
│       ├── src/
│       │   ├── app/           # page routes (book, tracking, dashboard, wallet, history)
│       │   ├── components/    # Navbar, DynamicMap, Map, UI cards
│       │   ├── context/       # AuthContext
│       │   └── lib/           # API fetch wrapper
│       └── Dockerfile
├── packages/
│   └── shared/                # Shared constants, types & fare config
├── docker-compose.yml         # Multi-container orchestration (db, api, web)
├── package.json               # Root workspaces configuration
└── README.md
```

---

## 🛠️ Setup & Deployment

### Option A: 1-Click Import on Vercel + Neon Postgres (Zero Config)

The repository is pre-configured with root `vercel.json`, automated Prisma client generation, and automatic Neon Postgres migrations + seed:

1. **Get your Neon Database URL:**
   * Create a free database at [neon.tech](https://neon.tech) and copy your connection string:
     `postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`
2. **Import directly in Vercel:**
   * Go to [vercel.com/new](https://vercel.com/new) and select `notthedexter/dhaka-tesla-pool`.
   * Vercel auto-detects `vercel.json` (`framework: nextjs`, `buildCommand: node scripts/vercel-build.js`).
3. **Environment Variables:**
   * Add `DATABASE_URL`: Paste your Neon Postgres connection string.
   * *(Optional)* `JWT_SECRET`: Any random string for signing JWT tokens.
4. **Deploy:** Click **Deploy**.
   * The automated build pipeline detects `DATABASE_URL`, automatically applies Prisma migrations to Neon, and seeds the 12 Dhaka areas and demo accounts (Jashim, Nusrat, Rafiq, Shirin).
   * Frontend and serverless API run instantly connected to your Neon database!

---

### Option B: Running with Docker (Full Stack)

1. **Clone the repository:**
   ```bash
   git clone git@github.com:notthedexter/dhaka-tesla-pool.git
   cd dhaka-tesla-pool
   ```

2. **Start all services:**
   ```bash
   docker compose up --build -d
   ```

3. **Seed demo data:**
   ```bash
   docker compose exec api npx tsx prisma/seed.ts
   ```

4. **Access the application:**
   * **Web Frontend:** [http://localhost:3000](http://localhost:3000)
   * **API Backend:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

### Option B: Local Manual Setup

1. **Prerequisites:**
   * Node.js v20+ or v22+
   * Docker (for PostgreSQL container)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start PostgreSQL Database:**
   ```bash
   docker compose up db -d
   ```

4. **Run Prisma Migrations & Seed:**
   ```bash
   cd apps/api
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   cd ../..
   ```

5. **Start Development Servers:**
   ```bash
   npm run dev
   ```
   * Frontend: [http://localhost:3000](http://localhost:3000)
   * Backend: [http://localhost:4000](http://localhost:4000)

---

## 🔑 Demo Credentials

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Driver** | Jashim Uddin | `jashim@tesla.pool` | `password123` | Pilot of "Bullet" (3 Seats) |
| **Passenger** | Nusrat Jahan | `nusrat@tesla.pool` | `password123` | ৳1,000 TeslaPay Balance |
| **Passenger** | Rafiq Ahmed | `rafiq@tesla.pool` | `password123` | ৳500 TeslaPay Balance |
| **Passenger** | Shirin Akter | `shirin@tesla.pool` | `password123` | ৳500 TeslaPay Balance |

---

## 📡 Key API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT |
| `POST` | `/api/auth/register` | Public | Register passenger or driver |
| `GET` | `/api/auth/me` | User | Get current authenticated user |
| `GET` | `/api/areas` | Public | List 12 Dhaka areas with coordinates |
| `GET` | `/api/areas/distance` | Public | Calculate OSRM driving distance & route |
| `POST` | `/api/rides` | Passenger | Book a ride & auto-match with pool |
| `GET` | `/api/rides/my` | Passenger | List passenger ride history |
| `GET` | `/api/rides/:id` | Passenger/Driver | Detailed ride status with wait estimate |
| `PATCH`| `/api/rides/:id/cancel` | Passenger | Cancel ride before departure |
| `PATCH`| `/api/drivers/status` | Driver | Toggle driver Online / Offline |
| `GET` | `/api/drivers/requests` | Driver | View incoming ride requests |
| `POST` | `/api/drivers/accept/:rideId` | Driver | Accept ride into active or advance pool |
| `GET` | `/api/drivers/pool/current` | Driver | Get active & awaiting advance pools |
| `PATCH`| `/api/drivers/pool/:id/arrive`| Driver | Mark driver arrived at pickup hub |
| `PATCH`| `/api/drivers/pool/:id/start` | Driver | Depart and start trip (All onboard) |
| `PATCH`| `/api/drivers/pool/:id/complete`| Driver | Complete trip & process payments |
| `GET` | `/api/wallet/balance` | Passenger | Fetch TeslaPay wallet balance |
| `POST` | `/api/wallet/topup` | Passenger | Top-up TeslaPay balance |
| `GET` | `/api/wallet/transactions` | Passenger | View payment ledger history |

---

## 🧪 Automated Testing

Run the test suite:
```bash
# Run unit tests (Fare engine verification)
npm run test:api

# Run TypeScript typechecks
npm run build:api
npm run build:web
```

---

## 📄 License
ISC License © 2026 Md Mehedi Hasan Shishir
