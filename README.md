# BookKeeper — Scalable Bookkeeping System

A full-stack bookkeeping system built for the [Soraban engineering take-home project](https://github.com/Soraban/engineering-project).

**Demo walkthrough:** [Loom video](https://www.loom.com/share/9daab3f211ab4f50a91cfd8bcf326911)  
**UI design:** [Figma](https://www.figma.com/design/VdrXNjGUB7ggU02hiqH9za/Engineering-Project?node-id=0-1)

## Features

- **Record & import transactions** — manual entry or CSV import with malformed-data handling
- **Bulk actions & categorization** — select multiple transactions and apply categories at once
- **Rules-based + AI auto-categorization** — priority-ordered rules with Claude Haiku fallback
- **Custom rules** — user-defined rules with automatic recategorization sweeps
- **Anomaly detection** — flags duplicates, missing metadata, unusual amounts, and suspicious round values
- **Review dashboard** — surfaces uncategorized and flagged transactions for approval or editing
- **Scalable data layer** — keyset pagination, batch CSV imports, and indexed queries for 1M+ transactions

## Monorepo Layout

```
/
├── backend/          # Rails 8 API-only app (port 3000)
├── frontend/         # React 18 + Vite app (port 5173)
├── sample_csvs/      # Sample CSV files for testing imports
├── docker-compose.yml
└── CLAUDE.md         # Additional dev notes for AI-assisted workflows
```

## Running Locally

### Prerequisites

- Ruby 3.4 (via Homebrew: `brew install ruby`)
- Node 22+
- PostgreSQL 16 (`brew install postgresql@16`)
- Redis (recommended — required for Sidekiq CSV imports and AI jobs)

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

**Terminal 2 — Sidekiq (CSV imports + AI jobs)**

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

Open [http://localhost:5173](http://localhost:5173) and log in with `demo@bookkeeping.com` / `password123`.

### Environment Variables

Create `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...    # optional — AI categorization degrades gracefully without it
DEVISE_JWT_SECRET_KEY=...       # run: bundle exec rails secret
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=...                # optional, defaults to localhost bookkeeping_development
FRONTEND_URL=http://localhost:5173
```

## Sample CSV Files

| File | Purpose |
|------|---------|
| `sample_csvs/malformed_edge_case_1.csv` | Missing fields, bad dates, invalid amounts |
| `sample_csvs/malformed_edge_case_2.csv` | Duplicates, empty rows, mixed formatting |
| `sample_csvs/large_5000.csv` | 5,000-row import for quick performance testing |
| `sample_csvs/large_500000.csv` | 500,000-row import for large-scale testing |
| `sample_csvs/large_import.py` | Script to regenerate the 5k-row sample CSV |

## Running Tests

```bash
# Backend
cd backend && bundle exec rspec

# Frontend (type check + production build)
cd frontend && npm run build
```

## Architecture

### Rules Engine (`backend/app/services/rules_engine.rb`)

Rules are evaluated in **priority order** (ascending integer). First match wins. Condition types:

- `description`: contains, starts_with, ends_with, matches_regex
- `amount`: gt, lt, gte, lte, eq
- `date`: day_of_week, month

A starter rule set ships in `backend/config/rule_set_starter.yaml`.

### AI Categorization (`backend/app/jobs/ai_categorization_job.rb`)

- Runs only when no rule matches (rules-first, AI as fallback)
- Uses Claude Haiku via tool use for structured JSON output
- Minimum 0.6 confidence threshold before applying
- Graceful degradation if `ANTHROPIC_API_KEY` is absent

### Anomaly Detection (`backend/app/services/anomaly_detector.rb`)

Flags are stored as JSONB in the `anomaly_flags` column:

- `missing_description` — blank or nil description
- `duplicate` — same user, date, amount, and description within 24h
- `unusual_amount` — exceeds mean + 3σ for the user's category (requires 10+ data points)
- `suspicious_round` — amount divisible by 1000 and greater than $5,000

### Performance

- **Keyset pagination** (cursor-based) instead of OFFSET — O(log n) regardless of page depth
- **`insert_all`** for CSV batch imports — no N+1, no callbacks overhead
- **GIN index** on `description` for trigram text search
- **Partial index** on `status='flagged'` for fast review queue queries
- **Redis cache** for dashboard stats (5 min TTL) and user anomaly stats (1h TTL)

## API

REST API under `/api/v1/` with JWT authentication (Devise + devise-jwt):

- Transactions CRUD, bulk categorize, bulk approve
- CSV import with async processing via Sidekiq
- Rules and rule sets management
- Dashboard stats and review queue
- Recategorization status polling

## Tech Stack

- **Backend:** Ruby on Rails 8 (API-only), PostgreSQL, Sidekiq, Redis
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, Recharts
