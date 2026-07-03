# Keyhold — Rent & Flatmate Finder

An AI-powered platform where owners list rooms, tenants create "looking for room"
profiles, and an LLM-driven compatibility engine scores and ranks matches. Once a
tenant's interest is accepted, both parties get a real-time chat, and email
notifications fire on key events (high-compatibility interest, accept/decline).

## Stack

- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, Socket.IO, JWT auth
- **Frontend**: React (Vite), React Router, Axios, Socket.IO client
- **LLM**: Anthropic API (Claude) for compatibility scoring, with a deterministic
  rule-based fallback when the LLM is unavailable
- **Email**: Nodemailer (SMTP — works with Gmail App Passwords, Mailtrap, etc.)

---

## 1. Project structure

```
rent-flatmate-finder/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema (see section 4)
│   │   └── seed.js             # creates an initial admin user
│   ├── src/
│   │   ├── config/db.js        # Prisma client singleton
│   │   ├── middleware/         # auth, optionalAuth, role guard
│   │   ├── controllers/        # request handlers per resource
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # llmService, scoringService, emailService
│   │   ├── sockets/chatSocket.js
│   │   ├── utils/ruleBasedScore.js
│   │   └── index.js            # app entry point (Express + Socket.IO)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.js       # Axios instance with JWT interceptor
│   │   ├── context/AuthContext.jsx
│   │   ├── components/         # Navbar, ListingCard, CompatibilityBadge
│   │   ├── pages/               # Login, Register, Browse, OwnerDashboard, Chat, Admin...
│   │   └── App.jsx              # routes + role-based route guards
│   ├── .env.example
│   └── package.json
└── SYSTEM_DESIGN.md
```

---

## 2. Local setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local, or a free-tier instance on Railway/Supabase/Neon)
- An Anthropic API key (optional — the app works without one, using the
  rule-based fallback scorer)
- An SMTP account for email (Gmail App Password, Mailtrap free tier, etc.)

### Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, SMTP_*
npm install
npm run prisma:generate
npm run prisma:migrate    # creates tables from schema.prisma
npm run prisma:seed       # optional: creates an admin user (admin@keyhold.local / ChangeMe123!)
npm run dev                # starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173`, register as an Owner or Tenant, and go.

---

## 3. Environment variables

### backend/.env.example
```
PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/rent_flatmate?schema=public"
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-6
LLM_TIMEOUT_MS=8000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="Rent & Flatmate Finder <no-reply@example.com>"
HIGH_SCORE_THRESHOLD=80
```

### frontend/.env.example
```
VITE_API_URL=http://localhost:4000
```

---

## 4. Database schema

Core tables (see `backend/prisma/schema.prisma` for the full definition):

| Table | Purpose |
|---|---|
| `User` | tenant / owner / admin accounts, role-based |
| `Listing` | room listings (location, rent, availability, room type, furnishing, photos, status) |
| `TenantProfile` | one per tenant user: preferred location, budget range, move-in date |
| `CompatibilityScore` | **cached** LLM/fallback score per (tenant, listing) pair — unique constraint prevents recomputation |
| `Interest` | a tenant's expression of interest in a listing; status pending/accepted/declined |
| `Message` | chat messages, scoped to an `Interest` (i.e. an accepted tenant↔owner thread) |
| `Notification` | log of emails sent (type + payload), for audit/debugging |

Key relationships:
- `Listing.ownerId → User.id`
- `TenantProfile.userId → User.id` (1:1)
- `CompatibilityScore` has a unique `(tenantId, listingId)` constraint — this is
  what makes scores a cache rather than a live computation
- `Interest` has a unique `(tenantId, listingId)` constraint — a tenant can only
  express interest once per listing
- `Message.interestId → Interest.id` — chat is scoped per accepted interest, not
  a global DM system

---

## 5. API reference

All endpoints are prefixed with `/api`. Protected routes require
`Authorization: Bearer <token>`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | `{ name, email, password, role: TENANT\|OWNER }` |
| POST | `/auth/login` | — | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | ✓ | current user |

### Listings
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/listings?location=&budgetMin=&budgetMax=` | optional | browse active listings; if caller is a tenant with a profile, results include `compatibility` and are sorted by score desc |
| GET | `/listings/:id` | optional | listing detail + compatibility score if tenant |
| GET | `/listings/mine` | owner | owner's own listings with their interests |
| POST | `/listings` | owner | create listing |
| PATCH | `/listings/:id` | owner | update listing |
| PATCH | `/listings/:id/fill` | owner | mark as filled (hidden from browse) |

### Tenant profile
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenant/profile` | tenant | get own profile |
| PUT | `/tenant/profile` | tenant | upsert `{ preferredLocation, budgetMin, budgetMax, moveInDate }` |

### Interests
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/interests` | tenant | `{ listingId }` — sends interest; computes/caches score; emails owner if score > `HIGH_SCORE_THRESHOLD` |
| GET | `/interests/mine` | tenant | tenant's sent interests |
| PATCH | `/interests/:id/respond` | owner | `{ decision: "ACCEPTED"\|"DECLINED" }` — emails tenant |

### Chat
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/chat/:interestId/messages` | participant | message history (only for accepted interests) |

**WebSocket** (Socket.IO, connects to same origin as API, auth via `{ auth: { token } }`):
- `join_room { interestId }` → ack `{ ok, error? }`
- `send_message { interestId, content }` → persists + broadcasts `new_message` to room `interest:<id>`

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/activity` | admin | platform counts |
| GET | `/admin/users` | admin | list users |
| PATCH | `/admin/users/:id/ban` | admin | `{ isBanned }` |
| GET | `/admin/listings` | admin | list all listings |
| DELETE | `/admin/listings/:id` | admin | remove listing |

---

## 6. LLM compatibility scoring

**Prompt template** (`backend/src/services/llmService.js`):

```
Given this room listing:
{ "location": "...", "rent": ..., "roomType": "...", "furnishing": "...", "availableFrom": "..." }

and this tenant profile:
{ "preferredLocation": "...", "budgetMin": ..., "budgetMax": ..., "moveInDate": "..." }

Compute a compatibility score from 0 to 100 based on budget and location match.
Respond with ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
{ "score": number, "explanation": string }
```

**Example input:**
```json
// listing
{ "location": "Gomti Nagar, Lucknow", "rent": 12000, "roomType": "Private room",
  "furnishing": "Furnished", "availableFrom": "2026-08-01" }

// tenant profile
{ "preferredLocation": "Gomti Nagar, Lucknow", "budgetMin": 9000, "budgetMax": 13000,
  "moveInDate": "2026-08-15" }
```

**Example LLM output:**
```json
{
  "score": 92,
  "explanation": "Location matches exactly and rent (₹12,000) sits comfortably within the tenant's ₹9,000–13,000 budget."
}
```

**Fallback (rule-based, `backend/src/utils/ruleBasedScore.js`)** triggers on any
LLM error, timeout, missing API key, or malformed JSON response:
- starts at 100
- location: exact match = no penalty, partial substring match = -15, no match = -40
- budget: rent above `budgetMax` = penalty scaled to % over budget (capped at -50),
  rent below `budgetMin` = -10
- clamped to [0, 100], explanation prefixed with "Rule-based estimate (LLM unavailable)"
  and the row is tagged `source: FALLBACK` so the frontend can label it as an estimate

Scores are computed once per `(tenant, listing)` pair and cached in
`CompatibilityScore` — never recomputed on subsequent requests.

---

## 7. Deployment

- **Database**: provision Postgres on Railway / Supabase / Neon, copy the connection
  string into `DATABASE_URL`.
- **Backend**: deploy `backend/` to Railway or Render (both support long-lived
  Node processes, needed for Socket.IO — avoid serverless/edge for this service).
  Set all env vars from `.env.example` in the platform dashboard, then run
  `npm run prisma:migrate deploy` as a release step.
- **Frontend**: deploy `frontend/` to Vercel. Set `VITE_API_URL` to the deployed
  backend URL.
- Update `CLIENT_URL` in the backend env to the deployed frontend URL (for CORS).

---

## 8. Notes on scope / what's simplified for this build

- Photos are stored as plain URL strings (paste image URLs) rather than a file
  upload pipeline — swap in Cloudinary/S3 for production.
- Email sending is synchronous and best-effort (failures are logged, not retried)
  — a production build would use a queue (BullMQ, SQS) for retries.
- "Strong match" notification threshold is a single env var (`HIGH_SCORE_THRESHOLD`),
  not configurable per-owner.
