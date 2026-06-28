# RupeeLens — local setup & smoke test

This gets the **backend only** running locally so you can verify auth, the
DB, and the Groq categorisation fallback all work before we build the UI.

## 0. Prerequisites

- Node.js 20+
- A PostgreSQL database (local install, or a free hosted one — see below)
- A free Groq API key: https://console.groq.com/keys (no card required)
- A Google Cloud OAuth client (for login + Gmail read access)

## 1. Install dependencies

```bash
cd rupeelens
npm install
```

## 2. Set up Postgres

**Easiest path if you don't already have Postgres locally:** use a free
hosted instance — [Neon](https://neon.tech) or [Supabase](https://supabase.com)
both have a free tier and give you a ready-made `DATABASE_URL` in about
2 minutes. Either works fine for local dev against a remote DB.

**If you'd rather run it locally:**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16
createdb rupeelens

# Ubuntu/Debian
sudo apt install postgresql
sudo -u postgres createdb rupeelens
```

Either way, you end up with a connection string like:
```
postgresql://user:password@host:5432/rupeelens
```

## 3. Set up Google OAuth credentials

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (type: Web application)
3. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Enable the **Gmail API** for the project (APIs & Services → Library)
5. Copy the Client ID and Client Secret

## 4. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | From step 2 |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From step 3 |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (must be exactly 64 hex chars) |
| `GROQ_API_KEY` | From https://console.groq.com/keys |
| `CRON_SHARED_SECRET` | `openssl rand -base64 32` |

Leave `AI_PROVIDER=groq` and `GROQ_MODEL=llama-3.3-70b-versatile` as-is for now.

The server validates all of this at startup (`src/server/lib/env.ts`) and
will refuse to boot with a clear error if anything is missing or malformed
— so if it starts, your env is correct.

## 5. Run the database migration + seed

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

This creates all tables and seeds the 12 system default categories
(Housing, Food & dining, Transport, etc).

## 6. Start the server

```bash
npm run dev:server
```

You should see:
```
RupeeLens API listening on port 3000 [development]
[cron] hourly Gmail sync scheduled
```

If instead you see `❌ Invalid environment configuration`, fix whatever
it lists — that's the env validator catching a missing/malformed var
before anything else can go wrong.

## 7. Smoke test

These check the pieces that don't need a browser/frontend yet.

### 7a. Server is up
```bash
curl -i http://localhost:3000/auth/me
```
Expected: `401 {"error":"Authentication required"}` — this is correct!
It proves the auth middleware is wired and rejecting unauthenticated
requests, which is exactly what we want before login exists.

### 7b. CORS lockdown is working
```bash
curl -i -H "Origin: http://evil.example.com" http://localhost:3000/auth/me
```
Expected: a CORS error / the response should NOT include
`Access-Control-Allow-Origin: http://evil.example.com`.

### 7c. Rate limiting is active
```bash
for i in {1..25}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/auth/google; done
```
You should see `302` redirects at first, then `429 Too Many Requests`
once you exceed the 20-per-15-min auth limiter.

### 7d. Login flow (needs a browser, not curl)
Open this in a browser:
```
http://localhost:3000/auth/google
```
Complete the Google consent screen (including the Gmail read-only
permission). You should get redirected back and a `rl_session` cookie
should be set. Check with your browser's dev tools (Application →
Cookies) — confirm `rl_session` is `httpOnly: true`.

Then in the same browser session:
```
http://localhost:3000/auth/me
```
Expected: your user JSON (id, email, name, gmailConnected: true).

### 7e. Groq categorisation fallback works standalone

This tests the AI fallback in isolation, without needing a real Gmail
email. Create a throwaway test file:

```bash
cat > test-groq.mjs << 'EOF'
import "dotenv/config";
import { categorise } from "./src/server/services/categorise.js";

const categories = [
  "Housing", "Food & dining", "Transport", "Shopping", "Subscriptions",
  "Health", "Education", "Investments", "Utilities", "Entertainment",
  "Income", "Other",
];

// "Swiggy" should hit the keyword map instantly (no API call).
console.log(await categorise("SWIGGY BANGALORE", categories));

// A made-up merchant should fall through to Groq.
console.log(await categorise("RAMU TEA STALL KORAMANGALA", categories));
EOF

npx tsx test-groq.mjs
rm test-groq.mjs
```

Expected output:
```
{ category: 'Food & dining', method: 'keyword' }
{ category: '...', method: 'ai' }
```

The first line should return instantly with `method: 'keyword'` (no
network call). The second should take ~1 second and come back with
`method: 'ai'` and some plausible category — that's Groq's free-tier
Llama 3.3 70B doing the classification.

If this second call fails, check:
- `GROQ_API_KEY` is set correctly in `.env`
- You haven't hit the free tier's rate limit (30 req/min) from other testing
- Run `npx tsx test-groq.mjs` again with `console.error` output visible —
  failures are caught and logged, not thrown, so check your terminal output

### 7f. Manual transaction CRUD (once logged in)

With your `rl_session` cookie from 7d (use a browser extension like
"Cookie-Editor" to copy it, or just keep testing from the browser via
a tool like Postman/Insomnia configured to send cookies):

```bash
# Get your CSRF token first (it's set as a cookie after login: rl_csrf)
curl -i http://localhost:3000/api/categories \
  -H "Cookie: rl_session=<your-token>"
```
Expected: JSON array of 12 system categories.

## 8. What "working" looks like before we build the UI

- [ ] Server boots without env errors
- [ ] `/auth/me` returns 401 when logged out
- [ ] Google login redirects and sets `rl_session` cookie
- [ ] `/auth/me` returns your user JSON when logged in
- [ ] `/api/categories` returns the 12 seeded categories
- [ ] The Groq smoke test (7e) returns a keyword match instantly and an
      AI match within a couple seconds
- [ ] Rate limiting kicks in past the configured thresholds

Once all of these pass, the backend is solid and we can build the
frontend (`Layout.tsx`, `Dashboard.tsx`, `Transactions.tsx`, PWA config)
on top of an API you've already verified works.

## 9. Running the frontend

The frontend is built with React + Vite + Tailwind, and includes PWA support
(installable, offline-capable shell).

With the backend already running from step 6 (`npm run dev:server` in one
terminal), open a **second terminal tab** in the same project folder and run:

```bash
npm run dev:client
```

This starts Vite's dev server, typically at `http://localhost:5173`. Open
that URL in your browser.

You should land on the login screen (`Continue with Google`). Click it —
this redirects to the backend's `/auth/google` route, through the same
OAuth flow you already tested via curl/browser earlier, and back to the
app once logged in.

Once logged in you should see:
- **Dashboard** — stat cards (Income / Spend / Savings / Transaction count)
  and a recent-activity feed
- **Transactions** — filterable list (month, year, category, source)
- **Budgets** — placeholder for now (not built out this pass)
- **Settings** — Gmail connection status, manual sync button, logout

### Frontend smoke test

- [ ] `npm run dev:client` starts without errors
- [ ] Visiting `localhost:5173` while logged out shows the login screen
- [ ] "Continue with Google" completes the OAuth flow and lands on the Dashboard
- [ ] Dashboard shows stat cards (will show ₹0 everywhere until you have
      transactions — that's correct, not a bug)
- [ ] "Sync Gmail" button on Dashboard/Settings triggers a sync without erroring
- [ ] Transactions page filter bar changes the list when you change month/category/source
- [ ] Settings page shows your Gmail connection status and lets you log out

### Building for production

```bash
npm run build
```

This produces a `dist/` folder with the bundled app plus a generated
service worker (`sw.js`) and web app manifest — confirms the PWA config
is wired correctly. You won't deploy this yet, but it's worth running once
to confirm the build pipeline itself works end to end.

## Troubleshooting (frontend)

**Blank page / "Failed to fetch" errors in the browser console** — almost
always a CORS mismatch. Check `CORS_ORIGIN` in your backend `.env` matches
exactly where Vite is serving from (`http://localhost:5173` by default —
note no trailing slash, and `http` not `https` for local dev).

**Login redirects back to the login screen in a loop** — check the
`rl_session` cookie actually got set after the Google OAuth callback
(browser dev tools → Application → Cookies → `localhost`). If it's
missing, check the backend terminal for errors during the
`/auth/google/callback` step.

**"Continue with Google" does nothing / opens a blank tab** — the
`api.auth.googleLoginUrl()` helper points at `http://localhost:3000` by
default. If your backend runs on a different port, set
`VITE_API_BASE_URL` in a `.env` file at the project root (Vite reads
`.env` files separately from the backend's — you may want
`.env.local` specifically so it's not confused with the backend's `.env`):
```
VITE_API_BASE_URL=http://localhost:3000
```

**Tailwind classes not applying / page looks unstyled** — confirm
`postcss.config.js` and `tailwind.config.js` are both using `export default`
(ESM syntax), not `module.exports` (CommonJS) — this project's
`package.json` has `"type": "module"`, so CommonJS config files will
silently fail to load.

**Icons not rendering** — confirm `@tabler/icons-react` actually installed
(`ls node_modules/@tabler/icons-react` should show files). If a specific
category icon shows as a generic dots icon, check
`src/client/components/CategoryIcon.tsx` — only icons explicitly mapped
there render correctly; anything else falls back gracefully rather than
crashing.
**`prisma migrate dev` fails to connect** — double check `DATABASE_URL`,
and that the DB server is actually running / reachable (for hosted
Postgres, check the connection string includes `?sslmode=require` if
your provider needs it).

**Google OAuth callback shows an error** — the redirect URI in your `.env`
must match *exactly* (including `http://` vs `https://` and trailing
slashes) what's registered in Google Cloud Console.

**Groq call times out or 401s** — verify the key at
console.groq.com/keys is active and pasted without extra whitespace.

**`ENCRYPTION_KEY` validation error at boot** — it must be exactly 64
hex characters. `openssl rand -hex 32` always produces the right format;
don't hand-type it.

## 10. Database backups

Your transaction history lives in a local Postgres database with no
automatic backup. If your disk fails or the database gets corrupted, that
data is gone unless you've backed it up yourself.

### Manual backup

```bash
npm run db:backup
```

This dumps the database to `backups/rupeelens_<timestamp>.sql.gz`,
compressed. It automatically keeps only the 10 most recent backups and
prunes older ones, so disk usage stays bounded.

The `backups/` folder is gitignored — these files contain real financial
data and must never be committed or shared.

### Restoring from a backup

```bash
npm run db:restore
```

Lists available backups, asks which one to restore, and requires you to
type `YES` to confirm — it will not silently overwrite your current data.

### Automating backups (recommended)

Running `npm run db:backup` manually is easy to forget. To have it run
automatically every day, use macOS's `cron`:

```bash
crontab -e
```

This opens a text editor (likely `vi` — press `i` to start typing, `Esc`
then `:wq` to save and exit). Add a line like:

```
0 22 * * * cd /Users/yourusername/Downloads/rupeelens && /opt/homebrew/opt/postgresql@15/bin/pg_dump rupeelens | gzip > backups/rupeelens_$(date +%Y-%m-%d).sql.gz
```

This runs a backup every night at 10 PM, as long as your Mac is awake at
that time. Replace `/Users/yourusername/Downloads/rupeelens` with your
actual project path (run `pwd` inside the project folder to get it).

Note: `cron` jobs only run while your Mac is on and awake — if it's
asleep at the scheduled time, that day's backup is simply skipped. For a
personal local setup this is a reasonable tradeoff; just remember to run
`npm run db:backup` manually before any major change you're nervous about
(a schema migration, a risky bulk edit, etc.) rather than relying on the
schedule alone.

