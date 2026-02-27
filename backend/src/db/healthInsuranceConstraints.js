export const ensureHealthInsuranceUniquenessRule = async (sequelize) => {
  await sequelize.query(`
    DO $$
    DECLARE row_item RECORD;
    BEGIN
      FOR row_item IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'HealthInsurance'
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE (name)'
      LOOP
        EXECUTE format('ALTER TABLE "HealthInsurance" DROP CONSTRAINT IF EXISTS %I;', row_item.conname);
      END LOOP;
    END $$;
  `)

  await sequelize.query(`
    DO $$
    DECLARE row_item RECORD;
    BEGIN
      FOR row_item IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'HealthInsurance'
          AND (
            indexname ILIKE 'HealthInsurance_name_key%'
            OR indexname ILIKE 'healthinsurance_name_key%'
          )
      LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I;', row_item.indexname);
      END LOOP;
    END $$;
  `)

  await sequelize.query(`
    DROP INDEX IF EXISTS "healthinsurance_unique_name_discount_active";
  `)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "healthinsurance_unique_name_discount_active"
    ON "HealthInsurance" (LOWER("name"), "discountPercent")
    WHERE "deletedAt" IS NULL;
  `)
}
