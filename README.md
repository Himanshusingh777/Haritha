# Haritha Fresh — Vercel (serverless) version

Same app, same Supabase database — restructured to run entirely on
Vercel: React frontend (static) + the Express API as **one serverless
function**. No separate backend to host.

**The one real tradeoff:** no Socket.io (serverless functions can't hold
a persistent connection open), so the frontend **polls** `/api/state`
every 4 seconds instead of getting instant pushes. Order status, stock,
and live rider GPS all update within ~4 seconds instead of instantly.
Everything else works the same.

## What's in this folder
```
haritha-fresh-vercel/
├── vercel.json          ← build + routing config
├── package.json         ← deps for the /api function
├── schema.sql           ← same tables as before + one new small table
├── api/
│   ├── index.js         ← the whole REST API (Express, one function)
│   └── _db.js           ← Postgres helpers (underscore = not a route)
└── client/              ← React (Vite) frontend — same UI as before
    └── src/...
```

## Step 1 — Database
Same Supabase database as before. Run `schema.sql` once in Supabase's
SQL editor — it's safe even if you already ran the old one; it only
adds one new table:

- **`live_locations`** — holds a customer's current GPS pin while a
  rider is delivering their order. Serverless functions can't share
  in-memory state between requests like the old Socket.io setup did,
  so this lives in the DB instead. It self-cleans (rows get deleted
  once that order is delivered/rejected) and only ever holds one row
  per *currently active* delivery, so it stays tiny.

**Important:** grab the **pooler** connection string this time, not the
direct one — Supabase → Project Settings → Database → **Connection
pooling** → "Transaction" mode (port `6543`). Serverless functions open
many short-lived connections, and the pooler is built for exactly that;
the direct connection string can run out of slots under real traffic.

## Step 2 — Try it locally (optional)
```
npm install -g vercel        # if you don't have it
cd haritha-fresh-vercel
cp .env.example .env          # fill in DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, SECRET_KEY
vercel dev                    # serves the API on :3000
```
In a second terminal:
```
cd client
npm install
npm run dev                   # http://localhost:5173, proxies /api to :3000
```
Open `http://localhost:5173`.

## Step 3 — Deploy
1. Push this whole `haritha-fresh-vercel` folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **Add New** → **Project** → import that repo.
3. Vercel will read `vercel.json` automatically — you shouldn't need to
   change the build/output settings it detects, but if asked:
   - **Framework Preset:** Other
   - **Build Command:** `cd client && npm install && npm run build`
   - **Output Directory:** `client/dist`
4. **Environment Variables** (Project → Settings → Environment Variables):
   - `DATABASE_URL` — the **pooler** connection string from Step 1
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
   - `SECRET_KEY` — long random string
5. **Deploy.** Vercel gives you one URL — frontend and API both live there.

## A few honest notes
- **Polling, not push:** every connected browser quietly re-fetches
  `/api/state` every 4 seconds. For a single small shop this is nothing
  — but it is more database load than the old socket version, which
  only sent data when something actually changed. If you outgrow this,
  the fix is moving the API back to a host that supports WebSockets
  (Render/Railway/Fly.io) and keeping this same React frontend.
- **Passwords for existing accounts:** unchanged caveat from before —
  this backend hashes passwords with `bcryptjs`, the original Python
  one used Werkzeug's hasher. Pre-existing customer/partner accounts
  from before would need to re-register / get a password reset.
- **Cold starts:** Vercel's free tier functions can take a moment to
  wake up after being idle, same general idea as Render's free tier
  sleeping — just a different flavor of "first request is slower."

## If something goes wrong
- **Blank page** → check Vercel's **Deployments → Logs**. Most likely
  `DATABASE_URL` is missing/wrong in Environment Variables.
- **"Failed to load data from server" / 500s** → almost always the
  database. Double-check you used the **pooler** URI (port 6543), and
  that `schema.sql` has been run.
- **Login doesn't stick across requests** → check `SECRET_KEY` is set;
  without it, sessions still work but use a default secret (fine for
  testing, not for anything real).
