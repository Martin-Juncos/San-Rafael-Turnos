-- Rollback note:
-- Dropping duplicated constraints/indexes is irreversible without a prior snapshot
-- of exact names. This down migration is intentionally a no-op.
SELECT 1;
