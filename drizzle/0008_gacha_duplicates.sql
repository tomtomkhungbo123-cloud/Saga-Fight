ALTER TABLE gacha_spins ADD COLUMN refund INTEGER NOT NULL DEFAULT 0 CHECK (refund >= 0 AND refund < 150);
