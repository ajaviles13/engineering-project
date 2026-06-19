# BookKeeper — Scalable Bookkeeping System

## Project Overview

A full-stack bookkeeping system built for the Soraban engineering take-home project. Features:
- Manual + CSV transaction import
- Rules-based auto-categorization
- Statistical anomaly detection
- Bulk actions and review dashboard
- Designed for 1M+ transactions with keyset pagination and indexed queries

## Monorepo Layout

```
/
├── backend/          # Rails 8 API-only app (port 3000)
├── frontend/         # React 18 + Vite app (port 5173)
├── sample_csvs/      # Sample CSV files for testing imports
├── docker-compose.yml
└── CLAUDE.md
```

## Running Locally

### Prerequisites
- Ruby 3.4 (via Homebrew: `brew install ruby`)
- Node 22+ 
- PostgreSQL 16 (`brew install postgresql@16`)
- Redis (optional — for caching & Sidekiq)

### Setup

```bash
# Start PostgreSQL
brew services start postgresql@16

# Backend setup
cd backend
bundle install
bundle exec rails db:create db:migrate db:seed
# Seeds demo@bookkeeping.com / password123 + 50k transactions

# Frontend setup
cd ../frontend
npm install
```

### Running

**Terminal 1 — Rails API (port 3000)**
```bash
cd backend
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
bundle exec rails server
```

**Terminal 2 — Sidekiq (CSV imports)**
```bash
cd backend
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"
bundle exec sidekiq -C config/sidekiq.yml
```

**Terminal 3 — Frontend (port 5173)**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → login with `demo@bookkeeping.com` / `password123`

### Environment Variables

Create `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...    # optional — AI categorization degrades gracefully without it
DEVISE_JWT_SECRET_KEY=...       # run: bundle exec rails secret
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=...                # optional, defaults to localhost bookkeeping_development
FRONTEND_URL=http://localhost:5173
```

## Running Tests

```bash
# Backend
cd backend && bundle exec rspec

# Frontend (type check)
cd frontend && npm run build
```

## Architecture Decisions

### Rules Engine (`app/services/rules_engine.rb`)
Rules are evaluated in **priority order** (ascending integer). First match wins. Three condition types:
- `description`: contains, starts_with, ends_with, matches_regex
- `amount`: gt, lt, gte, lte, eq
- `date`: day_of_week, month

### Anomaly Detection (`app/services/anomaly_detector.rb`)
Flags stored as JSONB in `anomaly_flags` column. Four check types:
- `missing_description`: blank/nil description
- `duplicate`: same user/date/amount/description within 24h
- `unusual_amount`: > mean + 3σ for the user's category (requires 10+ data points)
- `suspicious_round`: amount divisible by 1000 and > $5000

### Performance
- **Keyset pagination** (cursor-based) instead of OFFSET — O(log n) regardless of page depth
- **`insert_all`** for CSV batch imports — no N+1, no callbacks overhead
- **GIN index** on `description` for trigram text search
- **Partial index** on `status='flagged'` for fast review queue queries
- **Redis cache** for dashboard stats (5 min TTL) and user anomaly stats (1h TTL)

## Coding Conventions
- Service objects in `app/services/` — call with `.call(args)`
- Background jobs in `app/jobs/` using Sidekiq
- No fat controllers — business logic lives in services
- No model callbacks for categorization/anomaly — explicit service calls only
