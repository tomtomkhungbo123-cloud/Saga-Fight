ALTER TABLE scoin_ledger RENAME TO scoin_ledger_before_gacha;
--> statement-breakpoint
CREATE TABLE scoin_ledger (
 user_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK (kind IN ('pve','online','purchase','gacha')),
 source_id TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK ((kind IN ('purchase','gacha') AND amount<0) OR (kind IN ('pve','online') AND amount>0)),
 created_at INTEGER NOT NULL,
 PRIMARY KEY (user_id,kind,source_id)
);
--> statement-breakpoint
INSERT INTO scoin_ledger SELECT * FROM scoin_ledger_before_gacha;
--> statement-breakpoint
DROP TABLE scoin_ledger_before_gacha;
--> statement-breakpoint
CREATE TABLE gacha_spins (
 user_id TEXT NOT NULL,
 request_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY (user_id,request_id)
);
