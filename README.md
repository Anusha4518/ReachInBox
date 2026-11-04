# ReachInbox – Full-Stack Email Scheduler

> A production-grade, zero-cron email scheduling service and modern dashboard built for the ReachInbox hiring assignment.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v24+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis-red.svg)](https://bullmq.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)

---

## 1. Project Overview

ReachInbox cold outreach systems depend on reliable, high-throughput email scheduling and delivery at scale. This service provides a complete solution that:
- Ingests cold email leads from **CSV/TXT** files or API payloads.
- Validates and de-duplicates email addresses.
- Schedules jobs using **BullMQ delayed queues backed by Redis** (strictly **zero cron**).
- Dispatches emails via **Ethereal Fake SMTP** with live message preview URLs.
- Enforces **configurable worker concurrency** and **minimum delays** between email sends.
- Implements **Redis-backed hourly sending rate limits per sender** (e.g., 200 emails/hour).
- Reschedules excess jobs into the next hourly window without dropping or failing them.
- Sends live **Slack alert notifications** when an hourly limit ceiling is breached.
- Indexes emails into **Elasticsearch** for sub-second recipient and subject search.
- Embeds a real-time **BullMQ dashboard UI** (`/admin/queues`) to monitor active, delayed, and completed jobs.
- **Survives server and worker restarts**: Guarantees zero dropped jobs, idempotent delivery, and state recovery.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios (configured with credentials and proxies)
- **Icons**: Lucide React

### Backend
- **Runtime & Language**: Node.js with TypeScript (`NodeNext` ESM)
- **Web Framework**: Express.js
- **Database & ORM**: MySQL with Prisma ORM
- **Job Queue**: BullMQ backed by Redis
- **SMTP**: Nodemailer + Ethereal Email
- **Search Engine**: Elasticsearch Client (`@elastic/elasticsearch`)
- **Queue Monitor**: `@bull-board/express` & `@bull-board/api`
- **Authentication**: Passport.js with Google OAuth 2.0 & Session Management
- **Integrations**: Slack OAuth 2.0 Web API

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    User["User / Recipient List (CSV)"] -->|1. Submit Campaign| Frontend["React Frontend (Vite)"]
    Frontend -->|2. POST /api/emails/schedule| Backend["Express API Server"]
    Backend -->|3. Validate & Parse Leads| CSVParser["CSV/TXT Lead Parser"]
    CSVParser -->|4. Store Records & Job IDs| MySQL[("MySQL Database (Prisma)")]
    Backend -->|5. Add Delayed Jobs| RedisQueue[("Redis (BullMQ Delayed Queue)")]
    Backend -->|6. Asynchronous Indexing| ES[("Elasticsearch")]

    RedisQueue -->|7. Delayed Trigger| Worker["BullMQ Concurrency Worker"]
    Worker -->|8. Check Hourly Limit| RateLimiter{"Hourly Rate Limiter"}
    RateLimiter -->|Limit Exceeded| SlackAlert["Post Slack Alert & Reschedule Next Hour"]
    RateLimiter -->|Allowed| SMTP["Ethereal SMTP Delivery"]
    SMTP -->|9. Update Status to SENT| MySQL
    SMTP -->|10. Update Sent Timestamp| ES
```

---

## 4. Key Architectural Highlights

### A. Zero Cron & Delayed Queues
- **Constraint**: No OS crontab, `node-cron`, or polling timers.
- **Implementation**: When emails are scheduled, each recipient is assigned an exact delivery timestamp. BullMQ schedules these directly into Redis as delayed jobs (`delay = Math.max(0, targetTime - now)`). Redis automatically promotes them to the active queue when the delay expires.

### B. Idempotency & Restart Persistence
- **The Problem**: Worker or server restarts could cause duplicate emails or lost jobs.
- **The Solution**:
  1. Every email record generated in MySQL has a deterministic `jobId` (`job_${email.id}`).
  2. BullMQ uses this exact `jobId`, preventing Redis from ever accepting duplicate jobs.
  3. When a worker picks up a job, it performs a database state check: if `email.status === 'SENT'`, the job completes immediately without re-sending.
  4. On server or worker boot, `syncPendingEmailsFromDatabase()` queries MySQL for any `SCHEDULED` emails and reconciles them with Redis so future emails are never lost.

### C. Rate Limiting & Provider Delay
- **Provider Throttling**: A configurable delay (`EMAIL_DELAY_MS=2000`) is enforced between individual email sends. Staggered offsets space out multi-recipient batches automatically.
- **Multi-Worker Safe Hourly Ceiling**: An atomic Redis counter (`ratelimit:hourly:${senderEmail}:${hourWindow}`) tracks sends.
- **No Dropped Jobs**: When the counter exceeds `MAX_EMAILS_PER_HOUR`, jobs are rescheduled for the start of the next hour window (`job.moveToDelayed`).
- **Slack Alert Deduplication**: Redis `SET NX` ensures that only **one Slack notification** is dispatched per sender per hour window, preventing alert spam.

---

## 5. Folder Structure

```text
ReachInBox/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            # MySQL database models & relations
│   ├── src/
│   │   ├── config/
│   │   │   ├── bullBoard.ts         # Bull-board dashboard setup
│   │   │   ├── db.ts                # Prisma client singleton
│   │   │   ├── env.ts               # Type-safe environment config
│   │   │   ├── passport.ts          # Google OAuth 2.0 Strategy
│   │   │   └── redis.ts             # Redis connection singleton
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts   # Login, me, logout, dev login
│   │   │   ├── email.controller.ts  # Schedule, preview, search, lists
│   │   │   └── slack.controller.ts  # Slack OAuth and webhooks
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts   # Session requireAuth guard
│   │   ├── queues/
│   │   │   └── email.queue.ts       # BullMQ queue & restart recovery
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # /api/auth
│   │   │   ├── email.routes.ts      # /api/emails
│   │   │   └── slack.routes.ts      # /api/slack
│   │   ├── services/
│   │   │   ├── elasticsearch.service.ts # Indexing and search fallback
│   │   │   ├── email.service.ts     # Database queries and scheduling
│   │   │   ├── rateLimiter.service.ts   # Redis atomic hourly limiter
│   │   │   ├── slack.service.ts     # Slack chat.postMessage
│   │   │   └── smtp.service.ts      # Nodemailer + Ethereal SMTP
│   │   ├── utils/
│   │   │   └── csvParser.ts         # CSV/TXT lead extractor & validator
│   │   ├── workers/
│   │   │   └── email.worker.ts      # BullMQ worker processor
│   │   ├── app.ts                   # Express app setup & middleware
│   │   └── server.ts                # App entrypoint & graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ComposeEmailModal.tsx # Upload leads, schedule modal
    │   │   ├── ProtectedRoute.tsx    # Auth guard wrapper
    │   │   ├── ScheduledEmailsTable.tsx # Queued emails table
    │   │   ├── SentEmailsTable.tsx   # Delivered emails table
    │   │   └── SlackModal.tsx        # Slack connection modal
    │   ├── context/
    │   │   └── AuthContext.tsx       # Auth state provider
    │   ├── pages/
    │   │   ├── DashboardPage.tsx     # Main ReachInbox dashboard
    │   │   └── LoginPage.tsx         # Google sign-in screen
    │   ├── services/
    │   │   └── api.ts                # Axios instance
    │   ├── types/                    # TypeScript interfaces
    │   ├── App.tsx                   # Routing & future flags
    │   └── index.css                 # Tailwind directives
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## 6. Setup & Installation

### Prerequisites
- **Node.js**: v18+ (tested on v24)
- **MySQL**: Running locally on port 3306 or via Docker
- **Redis**: Running locally on port 6379 or via Docker
- *(Optional)* **Elasticsearch**: Running on port 9200 (gracefully falls back to MySQL if offline)

> **Quick Docker Compose for local infra** (if you use Docker):
> ```bash
> docker run -d --name reachinbox-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=reachinbox mysql:8.0
> docker run -d --name reachinbox-redis -p 6379:6379 redis:alpine
> ```

---

### Step 1: Backend Setup

1. Open your terminal and navigate to `backend`:
   ```bash
   cd backend
   npm install
   ```

2. Configure `.env`:
   Review `backend/.env` and update credentials:
   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:5173

   DATABASE_URL="mysql://root:password@localhost:3306/reachinbox"

   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379

   # Google OAuth (Optional: Demo sign-in is built-in for instant testing)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

   # Ethereal Email (Auto-generated if left empty)
   ETHEREAL_HOST=smtp.ethereal.email
   ETHEREAL_PORT=587
   ETHEREAL_USER=
   ETHEREAL_PASS=

   ELASTICSEARCH_URL=http://localhost:9200

   # Slack OAuth (Optional: Demo quick-connect is built-in)
   SLACK_CLIENT_ID=
   SLACK_CLIENT_SECRET=
   SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback

   # Worker & Limits
   WORKER_CONCURRENCY=5
   EMAIL_DELAY_MS=2000
   MAX_EMAILS_PER_HOUR=200

   SESSION_SECRET=reachinbox_secret_key_2026
   ```

3. Sync database tables:
   ```bash
   npx prisma db push
   ```

4. Start backend server:
   ```bash
   npm run dev
   ```
   *The server starts on port `5000` with both the Express REST API and the BullMQ worker embedded.*

---

### Step 2: Frontend Setup

1. Open a second terminal window:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard opens on `http://localhost:5173`.*

---

## 7. Verifying Endpoints & Dashboards

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend App** | `http://localhost:5173` | Main ReachInbox Dashboard & Login |
| **API Health Check** | `http://localhost:5000/api/health` | Shows database and Redis connection status |
| **BullMQ Queue UI** | `http://localhost:5000/admin/queues` | Live visual queue monitor (delayed, active, completed) |

---

## 8. Restart Scenario & Verification Test

To verify restart resilience:
1. Schedule 10 emails with a start time 2 minutes in the future.
2. In the terminal, kill the backend server (`Ctrl + C`).
3. Note that MySQL holds the scheduled records and Redis retains delayed jobs.
4. Restart the backend (`npm run dev`).
5. Open `http://localhost:5000/admin/queues` — all delayed jobs resume smoothly and are delivered at their designated time with **zero duplicates**.

---

## 9. Submission Details
- **Assignment Submission Form**: [Filled & Submitted](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)
- **Collaborator Access Granted**: `Mitrajit` and `Yadav036`
- **GitHub Repository**: [https://github.com/Anusha4518/ReachInBox](https://github.com/Anusha4518/ReachInBox)

