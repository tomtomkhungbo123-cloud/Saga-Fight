CREATE TABLE scoin_ledger (
 user_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK (kind IN ('pve','online','purchase')),
 source_id TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK ((kind='purchase' AND amount<0) OR (kind<>'purchase' AND amount>0)),
 created_at INTEGER NOT NULL,
 PRIMARY KEY (user_id,kind,source_id)
);
--> statement-breakpoint
CREATE TABLE cosmetic_loadouts (
 user_id TEXT NOT NULL,
 slot TEXT NOT NULL,
 item_id TEXT NOT NULL,
 PRIMARY KEY (user_id,slot)
);
--> statement-breakpoint
CREATE TABLE online_score_reports (
 match_id TEXT NOT NULL,
 player INTEGER NOT NULL CHECK (player IN (0,1)),
 winner INTEGER NOT NULL CHECK (winner IN (0,1)),
 PRIMARY KEY (match_id,player)
);
