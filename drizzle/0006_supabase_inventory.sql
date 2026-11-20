CREATE TABLE inventory_storage_control (id INTEGER PRIMARY KEY CHECK(id=1),mode TEXT NOT NULL CHECK(mode IN ('legacy','migrating','supabase')));
--> statement-breakpoint
INSERT INTO inventory_storage_control(id,mode) VALUES(1,'legacy');
--> statement-breakpoint
CREATE TABLE supabase_inventory_synced (user_id TEXT NOT NULL,kind TEXT NOT NULL,source_id TEXT NOT NULL,PRIMARY KEY(user_id,kind,source_id));
--> statement-breakpoint
CREATE TABLE supabase_inventory_imports (user_id TEXT PRIMARY KEY,migrated_at INTEGER NOT NULL);
