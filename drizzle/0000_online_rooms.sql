CREATE TABLE duel_rooms (
 code TEXT PRIMARY KEY NOT NULL,
 host_key TEXT NOT NULL,
 guest_key TEXT,
 config TEXT NOT NULL,
 snapshot TEXT,
 guest_input TEXT,
 offer TEXT,
 answer TEXT,
 status TEXT NOT NULL DEFAULT 'waiting',
 host_seen INTEGER NOT NULL,
 guest_seen INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX duel_rooms_expiry_idx ON duel_rooms(expires_at);
