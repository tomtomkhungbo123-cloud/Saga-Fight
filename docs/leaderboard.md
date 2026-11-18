# Online leaderboard

The hosted Saga Fight site stores match history in Cloudflare D1 (`DB`, `game_matches`). Supabase Auth owns credentials and validates sessions. The leaderboard does not store passwords. It aggregates completed Online matches with two different authenticated participants, ordered by Online wins then win rate; equal records share a dense rank. PvE, local PvP, practice, guests, unfinished matches and self-play are excluded.

`GET /api/leaderboard?page=1` returns 25 rows per page and the caller's rank when a validated `X-Saga-Auth` session is present. Public responses expose only usernames, rank, aggregated match counts, favorite fighter and a caller-relative flag; never emails, Supabase IDs, room tokens or passwords. Existing records without a synchronized username show “Chiến binh ẩn danh” until the player signs in again. Profiles synchronize from server-validated account identities. Migration 0002 creates the username directory without modifying match history.

Results retain the existing host-reported completion protocol: frozen participant identities, room-secret authorization, host-only result submission and idempotent match completion. This is not a server-authoritative anti-cheat system: a modified host can still misreport a winner. Competitive prizes or strong anti-cheat require an authoritative match server or independently validated results.

The separate Render deployment does not automatically share D1. On Render, the existing adapter uses DATA_DIR/rooms.sqlite and requires persistent disk. The GitHub sync includes the leaderboard API, schema migration and frontend for Render as well. Local/Render startup applies the new schema migration automatically. Do not describe separate deployments as one shared ranking unless they are configured to use a common database.

The trophy uses two CSS opacity/transform sparkles, no particles or per-frame JavaScript, and honors reduced motion. Rankings fetch only when the dialog is opened, refreshed or paginated; no gameplay polling is added.
