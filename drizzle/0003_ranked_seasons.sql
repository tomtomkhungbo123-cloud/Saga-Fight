CREATE TABLE ranked_seasons (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 started_at INTEGER NOT NULL,
 ended_at INTEGER,
 opened_request TEXT UNIQUE,
 closed_by TEXT,
 CHECK (ended_at IS NULL OR ended_at>started_at)
);
--> statement-breakpoint
CREATE UNIQUE INDEX ranked_seasons_active_idx ON ranked_seasons((1)) WHERE ended_at IS NULL;
