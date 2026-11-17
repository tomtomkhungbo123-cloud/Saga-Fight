# Saga Fight 6.36.0 — Supabase accounts and release integrity

Render serves browser files from `web/` relative to `server.mjs`. Uploading files to the repository root or updating only `server.mjs` does not update the game.

Deploy the complete release in one commit, including `web/`, `worker/`, `scripts/`, `drizzle/`, `package.json`, `package-lock.json`, and `server.mjs`. Preserve the existing repository's unrelated files. Render: Node 24, Start Command `npm start`, repository root containing this package.json. Run `node scripts/release-check.mjs` before deploy. Startup now rejects mismatched package, HTML and game versions. `/healthz` returns actual frontend/game versions and SHA-256 of the served game file.

## Supabase

Set these runtime environment variables in Render (not in a committed .env file):

- `SUPABASE_URL`: project API URL
- `SUPABASE_PUBLISHABLE_KEY`: public publishable key (never service_role or sb_secret)

The Sites test environment is configured for the SagaFight project. Email/password signup is enabled and confirmation is required. In Supabase Authentication → URL Configuration, set the production Site URL to the Render URL and add both the Render and ChatGPT Site origins to Redirect URLs. Signup confirmation can be followed by returning to the game to sign in. No password reset flow is included in this patch.

Accounts, password hashes and authentication sessions belong to Supabase Auth. Display names are non-authoritative user metadata. Existing match statistics remain in the game backend's database: Sites D1 for the test site, Render SQLite under DATA_DIR for Render. They are not yet centralized into Supabase. Render needs persistent DATA_DIR storage to keep match statistics across deploys.

The frontend uses pinned, locally bundled official supabase-js 2.84.0. It submits credentials directly to Supabase, persists/refreshes sessions, and sends an access token only to same-origin game account requests and room create/join. The backend verifies that token using Supabase Auth getUser before associating a match with a user UUID. Room credentials and relay messages remain unchanged. Client-supplied platform identity headers are discarded.

Validation: 144 existing gameplay/network regression tests; 7 auth/bridge checks including rejected spoofed identity, rejected invalid token, verified UUID on PvE match, public-key-only config, and exact Worker/browser asset parity. Email signup confirmation and real-user login require user testing; no account or email was created during implementation.
