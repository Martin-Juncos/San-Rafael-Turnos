-- Safe migration: remove duplicated UNIQUE/FK/CHECK constraints and duplicated indexes.
-- Keeps the first canonical artifact per identical definition.

DO $$
DECLARE
  row_item RECORD;
BEGIN
  FOR row_item IN
    WITH ranked_constraints AS (
      SELECT
        n.nspname AS schema_name,
        t.relname AS table_name,
        c.conname AS constraint_name,
        c.contype,
        pg_get_constraintdef(c.oid) AS constraint_def,
        ROW_NUMBER() OVER (
          PARTITION BY c.conrelid, c.contype, pg_get_constraintdef(c.oid)
          ORDER BY c.conname
        ) AS rn
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND c.contype IN ('u', 'f', 'c')
    )
    SELECT schema_name, table_name, constraint_name
    FROM ranked_constraints
    WHERE rn > 1
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I;',
      row_item.schema_name,
      row_item.table_name,
      row_item.constraint_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  row_item RECORD;
BEGIN
  FOR row_item IN
    WITH ranked_indexes AS (
      SELECT
        n.nspname AS schema_name,
        t.relname AS table_name,
        i.relname AS index_name,
        pg_get_indexdef(i.oid) AS index_def,
        ROW_NUMBER() OVER (
          PARTITION BY t.oid, regexp_replace(pg_get_indexdef(i.oid), '^CREATE( UNIQUE)? INDEX [^ ]+ ON', 'CREATE\1 INDEX <name> ON')
          ORDER BY i.relname
        ) AS rn
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      LEFT JOIN pg_constraint c ON c.conindid = ix.indexrelid
      WHERE n.nspname = 'public'
        AND c.oid IS NULL
    )
    SELECT schema_name, index_name
    FROM ranked_indexes
    WHERE rn > 1
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I.%I;', row_item.schema_name, row_item.index_name);
  END LOOP;
END
$$;
