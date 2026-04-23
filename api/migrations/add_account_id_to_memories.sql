-- Add account_id column to memories table for tenant isolation
ALTER TABLE memories ADD COLUMN account_id TEXT;

-- Tenant-scoped query indexes
CREATE INDEX ix_memories_account_user_app ON memories(account_id, user_id, app_id);
CREATE INDEX ix_memories_account_active ON memories(account_id, is_active);

-- IMPORTANT: backfill account_id before enforcing NOT NULL in production.
-- Example options:
--   1) Assign legacy rows to a migration account_id
--      UPDATE memories SET account_id = 'legacy_migration' WHERE account_id IS NULL;
--   2) Remove legacy rows in test/dev environments
--      DELETE FROM memories WHERE account_id IS NULL;

-- Enforce non-null after backfill on production databases.
-- ALTER TABLE memories ALTER COLUMN account_id SET NOT NULL;
