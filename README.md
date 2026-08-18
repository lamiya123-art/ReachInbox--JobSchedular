# ReachInbox Email Job Scheduler — Monorepo Submission Brief

High-throughput, durable email job scheduler built with **Express.js, BullMQ, Redis, Prisma ORM, Nodemailer (Ethereal SMTP), Next.js 14 (App Router), Tailwind CSS, and TanStack Query**.

---

## 1. Architecture Overview

```
                          ┌─────────────────────┐
                          │   Next.js Frontend  │
                          │ (dashboard, compose)│
                          └──────────┬──────────┘
                                     │ REST (JSON)
                                     ▼
                          ┌─────────────────────┐
                          │   Express API       │
                          │ - auth (Google OAuth│
                          │ - /emails/schedule  │
                          │ - /emails/scheduled │
                          │ - /emails/sent      │
                          └──────────┬──────────┘
                                     │ writes row (status=PENDING)
                                     │ adds BullMQ delayed job
                                     ▼
                    ┌────────────────────────────────┐
                    │   PostgreSQL / SQLite Source   │
                    │   of Truth (Prisma ORM)        │
                    └────────────────────────────────┘
                                     ▲
                                     │ read/update status
                    ┌────────────────────────────────┐
                    │  BullMQ Worker process(es)     │
                    │  concurrency = WORKER_CONCURRENCY
                    │  - atomic claim (PROCESSING)   │
                    │  - checks rate limit (Lua)     │
                    │  - sends via Ethereal SMTP     │
                    │  - updates DB row (idempotent) │
                    │  - reschedules if limit hit    │
                    └────────────┬───────────────────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  Redis (BullMQ│
                         │  AOF ZSET +   │
                         │  Lua counters)│
                         └───────────────┘
```

---

## 2. Key Hardened Technical Implementations

### A. Real Google OAuth 2.0 Integration (Zero Mock/Fake Profile Fallback)
- **Authorization Initiation**: Clicking "Login with Google" on `/login` navigates to `http://localhost:4000/auth/google`.
- **Google Cloud Auth Request**: Initiates real Google OAuth redirect using `google-auth-library` with scopes `openid`, `profile`, `email` and `prompt=select_account`.
- **Callback & Token Verification**:
  `GET /auth/google/callback` exchanges authorization code for tokens, verifies ID token against `GOOGLE_CLIENT_ID`, extracts real Google user profile (`sub`, `email`, `name`, `picture`), upserts user in DB, and sets HTTP-only `reachinbox_user` cookie.
- **Strict Session Security & Unauthenticated Handling**:
  `GET /auth/me` checks session cookie `reachinbox_user`. Returns `401 Unauthorized` if session is missing/invalid. Zero hardcoded/mock profiles exist in production routes.

### B. Durable Delayed Job Scheduling (Zero Cron)
- No `cron`, `node-cron`, or `agenda` is used anywhere in the project (`grep` verified).
- `POST /emails/schedule` calculates target send time: `sendAt(i) = startTime + i * delayMs`.
- Enqueues BullMQ delayed job with `{ delay: sendAt(i) - now() }`.
- Stores `job.id` back onto the database row (`bullJobId`) and sets `status = 'QUEUED'`.

### C. Redis Persistence & Restart Survival
- **Redis Persistence Configuration**:
  ```yaml
  redis:
    image: redis:7-alpine
    container_name: reachinbox_redis
    restart: always
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  ```
  Redis AOF (`--appendonly yes`) ensures delayed BullMQ jobs survive Redis server restarts.

### D. True Idempotency & Atomic State Transition (`PROCESSING`)
- **Database Source of Truth**: The database row state protects against duplicate sends under retries or process restarts.
- **Atomic Worker Claiming**: Before sending an email, worker executes:
  ```ts
  const claimResult = await prisma.emailJob.updateMany({
    where: {
      id: emailJobId,
      status: { in: ['PENDING', 'QUEUED', 'RESCHEDULED'] },
    },
    data: { status: 'PROCESSING' },
  });
  if (claimResult.count === 0) return; // Skip if already claimed or SENT
  ```

### E. Atomic Redis Rate Limiting & Zero-Drop Rescheduling
- **Redis Key Pattern**: `rate:{senderId}:{YYYY-MM-DDTHH}` using atomic Lua script (`INCR` + `EXPIRE`).
- Over-limit jobs update DB state (`status = 'RESCHEDULED'`, `nextAttemptAt = nextWindowStart`) and call `job.moveToDelayed()`.

---

## 3. Environment Configuration & Google Cloud OAuth Setup

### Environment Configuration (`.env.example`)
```env
PORT=4000
DATABASE_URL=postgresql://reachinbox:reachinbox_pass@localhost:5432/reachinbox_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379

# Real Google OAuth 2.0 Credentials (Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback

SESSION_SECRET=reachinbox-super-secret-session-key

WORKER_CONCURRENCY=5
MIN_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

ETHEREAL_USER=
ETHEREAL_PASS=
```

### Google Cloud Console Configuration Instructions
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Set **Authorized JavaScript origins**:
   - `http://localhost:3000`
4. Set **Authorized redirect URIs**:
   - `http://localhost:4000/auth/google/callback`
5. Copy Client ID and Client Secret into your `.env` file.

---

## 4. Campaign-Specific Verification & Load Proofs

```bash
# 1. Campaign-Specific 1000+ Scheduled Jobs Load Test
npm run test:load

# 2. Process Restart Recovery & Idempotency Verification
npm run test:restart

# 3. Rate Limiting & Over-Limit Rescheduling Verification
npm run test:rate-limit
```

```text
====================================================
   REACHINBOX 1000+ JOB LOAD TEST                  
====================================================

Campaign: load-test-1787067198324

Expected jobs:                  1000
Database rows:                  1000
DB QUEUED rows:                 1000
BullMQ campaign jobs:           1000

Global BullMQ state (all campaigns):
  Delayed:                      4807
  Waiting:                      0
  Active:                       0
  Completed:                    212
  Failed:                       0

Campaign verification:
  Campaign jobs missing:        0
  Campaign jobs duplicated:     0
  Campaign jobs lost:           0

Enqueue duration:               8.82 seconds

Note: Global BullMQ counts include jobs from other campaigns. Campaign-specific verification is used to prove that all 1000 jobs created by this test were persisted and scheduled.

====================================================
SUCCESS: 1000/1000 campaign jobs persisted and scheduled successfully.
====================================================
```

---

## 5. Architectural Trade-offs

1. **Fixed Hourly Bucket vs. Sliding Window**: Implemented fixed UTC hour buckets (`rate:{senderId}:{YYYY-MM-DDTHH}`) for zero-overhead atomic Lua script evaluation in Redis.
2. **Polling vs. WebSockets**: Next.js TanStack Query polls `/emails/scheduled` and `/emails/sent` every 5 seconds, maintaining low server state complexity while providing instant UI reactivity.