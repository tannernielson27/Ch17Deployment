# Deployment Guide — Vercel + Supabase

> **Important:** The default prompts in `prompts.md` use **SQLite** (`better-sqlite3`),
> which is file-based and incompatible with Vercel's serverless runtime.
> This guide covers what needs to change to deploy to **Vercel + Supabase**.

---

## Why SQLite Doesn't Work on Vercel

Vercel functions are stateless and ephemeral — there is no persistent filesystem.
A `shop.db` file written in one request will not exist in the next.
Supabase provides a hosted **PostgreSQL** database that works over the network,
which is the correct replacement.

---

## Migration Overview

| SQLite (local) | Supabase/Vercel equivalent |
|---|---|
| `shop.db` file | Supabase PostgreSQL database |
| `better-sqlite3` | `@supabase/supabase-js` or `pg` |
| `python jobs/run_inference.py` (local) | Supabase Edge Function or external cron |
| `npm run dev` | `vercel dev` or `vercel deploy` |

---

## Step 1 — Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the Supabase SQL editor, recreate your schema:

```sql
-- Run these in the Supabase SQL editor
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  first_name  TEXT,
  last_name   TEXT,
  email       TEXT
);

CREATE TABLE products (
  product_id   SERIAL PRIMARY KEY,
  product_name TEXT,
  price        NUMERIC
);

CREATE TABLE orders (
  order_id         SERIAL PRIMARY KEY,
  customer_id      INTEGER REFERENCES customers(customer_id),
  order_timestamp  TIMESTAMPTZ DEFAULT NOW(),
  fulfilled        INTEGER DEFAULT 0,
  total_value      NUMERIC
);

CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id      INTEGER REFERENCES orders(order_id),
  product_id    INTEGER REFERENCES products(product_id),
  quantity      INTEGER,
  unit_price    NUMERIC
);

CREATE TABLE order_predictions (
  order_id                  INTEGER PRIMARY KEY REFERENCES orders(order_id),
  late_delivery_probability NUMERIC,
  predicted_late_delivery   INTEGER,
  prediction_timestamp      TIMESTAMPTZ
);
```

3. Use the Supabase dashboard **Table Editor > Import** (or `psql`) to import your
   existing data from `shop.db`.

---

## Step 2 — Swap the DB Client

Replace `better-sqlite3` with `@supabase/supabase-js`:

```bash
npm install @supabase/supabase-js
npm uninstall better-sqlite3
```

Update `lib/db.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // server-side only
)

export default supabase
```

Add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> Get these from Supabase Dashboard → Project Settings → API.

---

## Step 3 — Update SQL Queries

PostgreSQL syntax differs slightly from SQLite:

| SQLite | PostgreSQL |
|---|---|
| `datetime('now')` | `NOW()` |
| `INTEGER` auto-increment | `SERIAL` |
| `first_name \|\| ' ' \|\| last_name` | same (works in PostgreSQL too) |
| `PRAGMA table_info(...)` | `information_schema.columns` |

Update the priority queue query `||` concatenation stays the same, but change
`WHERE o.fulfilled = 0` — this is fine as-is in PostgreSQL.

---

## Step 4 — Handle the Inference Job

The Python `jobs/run_inference.py` script cannot run inside a Vercel serverless function.
Options:

### Option A — Run locally, write to Supabase
Update the script to connect to Supabase via `psycopg2` or `supabase-py` instead of SQLite,
then run it manually from your local machine. The web app reads predictions from Supabase.

```python
# jobs/run_inference.py (Supabase version)
import os
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
# ... score orders, then:
supabase.table("order_predictions").upsert(predictions).execute()
```

### Option B — Supabase Edge Function (advanced)
Deploy `run_inference.py` logic as a Supabase Edge Function (Deno/TypeScript) and call it
via an HTTP endpoint from the `/scoring` page instead of spawning a subprocess.

### Option C — External cron service
Use a service like [cron-job.org](https://cron-job.org) or GitHub Actions to run the
inference script on a schedule and write results to Supabase.

---

## Step 5 — Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel deploy
```

Add your environment variables in the Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Summary Checklist

- [ ] Supabase project created and schema migrated
- [ ] Data imported from `shop.db`
- [ ] `lib/db.ts` updated to use Supabase client
- [ ] All SQL queries updated for PostgreSQL syntax
- [ ] Inference job updated to write to Supabase
- [ ] `.env.local` populated with Supabase keys
- [ ] App runs locally with `npm run dev` against Supabase
- [ ] Deployed to Vercel with env vars set
