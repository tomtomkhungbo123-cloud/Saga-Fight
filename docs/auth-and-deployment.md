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

## Username accounts (auth2)

New registrations ask only for a username, password and password confirmation. Usernames are case-insensitive ASCII letters, digits or underscore, 3–24 characters. The canonical identity is mapped to `username@players.sagafight.invalid`, a reserved non-deliverable address; no real email is collected. Supabase still owns password hashing, uniqueness, sessions and rate limits. Existing email accounts can use their original email in the login field.

Before opening registration, in the SagaFight Supabase project go to Authentication → Sign In / Providers → Email and turn Confirm email off. Leave Email/password sign-in enabled. Check the public `/auth/v1/settings` response has `mailer_autoconfirm: true`. The registration form checks this before sending signup, so it does not create unusable accounts or send confirmation requests when the setting remains on. This project-level change also applies to future legacy email signups.

New accounts have no email recovery channel. Account recovery needs a separate verified admin process. The application does not grant privileges based on editable username metadata. The profile username is derived from the verified internal Auth address. Existing UUIDs/statistics and game networking stay intact.

Validation: username normalization/collisions, invalid names, no signup while confirmation is enabled, real-session-required result handling, old email login compatibility, verified profile username, existing auth/bridge checks. Actual registration is pending the project's Confirm email switch; no real account was created in this update.

## Durable shared account store (inventory-durable1)

Production Node/Render now forwards all public `/api/*` requests to the existing public Saga Fight Site's D1 authority. `ACCOUNT_BACKEND_ORIGIN` defaults to `https://sagafight.neat-bowl-4907.chatgpt.site` when `RENDER=true` or `NODE_ENV=production`; local development retains local SQLite. Only HTTPS origins are accepted, apart from explicit test loopback. Authentication tokens are verified by the authority; cookies and client identity/admin headers are not forwarded. Never point this setting back at Render.

The ephemeral SQLite file only owns transport rooms in production. The Site bridge calls `/relay-api/rooms/{create,join,sync,leave}` on Render so public room requests can pass through D1 without a forwarding loop. The bridge temporarily falls back on 404 to the old Render room endpoint for rolling upgrades. Deploy the Site bridge before the updated Render server. Both frontends then share account inventories, Scoin, gifts, equipment, stats and seasons by the same verified Supabase user UUID.

An unavailable authority returns 503; it never falls back to a new empty inventory. `/healthz` must report `accountStorage: durable-shared`. The shop preserves prior state on errors and does not interpret a missing authenticated response as an empty bag. No account migration, inventory wipe or seed operation runs during builds. Keep the existing Site project ID and `d1: DB` binding when publishing.

This protects future data. It does not recover SQLite files already removed by past Render deploys. Existing Render-only records require an independently retained database backup and a reviewed import; do not claim they have been migrated or recreate ownership from untrusted browser storage. Existing D1 records remain untouched. Do not delete a surviving old `.data/rooms.sqlite` backup.

Validation: restart/replace the Node server with an entirely empty application data directory and confirm the same account keeps its purchased skin, equipment and 820 Scoin; duplicate purchases remain idempotent; guests cannot see another bag; outages do not switch to SQLite; relay-only requests never recurse. Production network access to the public D1 authority was checked using the server's application User-Agent. No real user account was changed by these tests.
