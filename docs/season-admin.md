# Season management

Production starts with virtual “Mùa 1” (id 0, start 0), preserving existing ranked records. Merely deploying this change does not reset the leaderboard. The first explicit admin rotation persists the closed initial season and opens the next season atomically. Later rotations close the expected current season and create a new one. A unique partial index allows only one open persisted season.

Rankings require distinct authenticated Online participants, created_at >= season start and finished_at in [start, end). A match spanning a season boundary remains in lifetime statistics but is excluded from seasonal rankings. Archived rankings cannot be changed by late match completions. Historical names can reflect the current public username. Lifetime match records and favorite-warrior statistics are never deleted.

Public APIs: GET /api/seasons lists up to 100 latest seasons; GET /api/leaderboard?season=<id> selects a season. Without selection, the active season is used. Account rank always uses the active season.

Admin API: GET/POST /api/admin/seasons requires a Supabase-verified session whose server-controlled app_metadata.saga_role is exactly "admin". User metadata, usernames, localStorage and all incoming oai-* headers are ignored for privileges. The backend removes spoofed headers before setting its internal admin claim. There is no public API for granting admin.

POST requires same-origin Origin, a name of 2–48 characters, expectedSeason, a UUID operation id and confirm="KET THUC MUA". The atomic compare-and-set rejects stale/concurrent rotations. Retrying the same operation is idempotent. The closed season records the admin UUID and time; public APIs do not expose that UUID. The UI requires typed confirmation and disables submission while pending.

To designate an administrator, the owner must explicitly identify the game account first. Use Supabase's trusted admin tooling to set raw_app_meta_data.saga_role to "admin" for the exact verified account UUID, preserving other metadata. Never infer the admin account from its username or grant the role to the first registrant. Refresh the account session after assignment. Removing the role revokes API access on the next verified request. The current project had zero accounts assigned this role at implementation time; no privileges were granted by this update.

Admin entry points are inside the signed-in Account panel and the leaderboard. They remain hidden until the backend confirms manageSeasons. Season closure requires an explicit user action; no season was closed during deployment or QA. Production D1 and separate Render SQLite deployments retain independent seasons unless connected to a common database.
