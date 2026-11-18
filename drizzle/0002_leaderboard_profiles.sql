CREATE TABLE player_profiles (
 user_id TEXT PRIMARY KEY NOT NULL,
 display_name TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX game_matches_online_rank_idx ON game_matches(mode,winner,finished_at);
