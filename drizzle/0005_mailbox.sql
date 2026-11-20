CREATE TABLE cosmetic_inventory (
 user_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 source TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,item_id)
);
--> statement-breakpoint
CREATE TABLE admin_messages (
 id TEXT PRIMARY KEY,
 sender_id TEXT NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 item_id TEXT,
 audience TEXT NOT NULL CHECK(audience IN ('one','all')),
 target_id TEXT,
 created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE mailbox_receipts (
 message_id TEXT NOT NULL REFERENCES admin_messages(id),
 user_id TEXT NOT NULL,
 read_at INTEGER,
 claimed_at INTEGER,
 PRIMARY KEY(message_id,user_id)
);
--> statement-breakpoint
CREATE INDEX mailbox_user_idx ON mailbox_receipts(user_id,message_id);
