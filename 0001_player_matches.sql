ALTER TABLE duel_rooms ADD COLUMN host_user_id TEXT;
--> statement-breakpoint
ALTER TABLE duel_rooms ADD COLUMN guest_user_id TEXT;
--> statement-breakpoint
CREATE TABLE game_matches (
 id TEXT PRIMARY KEY NOT NULL,
 mode TEXT NOT NULL CHECK (mode IN ('pve','online')),
 room_code TEXT,
 generation INTEGER,
 p1 TEXT NOT NULL,
 p2 TEXT,
 host_user_id TEXT,
 guest_user_id TEXT,
 winner INTEGER CHECK (winner IN (0,1)),
 created_at INTEGER NOT NULL,
 finished_at INTEGER
);
--> statement-breakpoint
CREATE INDEX game_matches_host_idx ON game_matches(host_user_id,finished_at);
--> statement-breakpoint
CREATE INDEX game_matches_guest_idx ON game_matches(guest_user_id,finished_at);
