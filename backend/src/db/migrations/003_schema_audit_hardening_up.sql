-- Safe migration: add missing indexes and check constraints.
-- Uses NOT VALID + VALIDATE to reduce lock impact where possible.

CREATE INDEX IF NOT EXISTS doctor_specialty_active_idx
  ON "Doctor" ("specialtyId")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS appointment_hold_created_idx
  ON "Appointment" (status, "createdAt")
  WHERE status = 'hold' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS appointment_doctor_date_time_status_idx
  ON "Appointment" ("doctorId", date, "startTime", status)
  WHERE "deletedAt" IS NULL;

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
END
$$;

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
END
$$;

DROP INDEX IF EXISTS "healthinsurance_unique_name_discount_active";
CREATE UNIQUE INDEX IF NOT EXISTS "healthinsurance_unique_name_discount_active"
  ON "HealthInsurance" (LOWER("name"), "discountPercent")
  WHERE "deletedAt" IS NULL;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_end_time_gt_start_time_chk
  CHECK ("endTime" > "startTime") NOT VALID;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_discount_percent_range_chk
  CHECK ("discountPercentApplied" >= 0 AND "discountPercentApplied" <= 100) NOT VALID;

ALTER TABLE "DoctorAvailability"
  ADD CONSTRAINT doctor_availability_day_of_week_range_chk
  CHECK ("dayOfWeek" BETWEEN 0 AND 6) NOT VALID;

ALTER TABLE "DoctorAvailability"
  ADD CONSTRAINT doctor_availability_slot_minutes_positive_chk
  CHECK ("slotMinutes" > 0 AND "slotMinutes" <= 240) NOT VALID;

ALTER TABLE "DoctorBlock"
  ADD CONSTRAINT doctor_block_end_time_gt_start_time_chk
  CHECK ("endTime" > "startTime") NOT VALID;

ALTER TABLE "Payment"
  ADD CONSTRAINT payment_amount_non_negative_chk
  CHECK (amount >= 0) NOT VALID;

ALTER TABLE "Appointment" VALIDATE CONSTRAINT appointment_end_time_gt_start_time_chk;
ALTER TABLE "Appointment" VALIDATE CONSTRAINT appointment_discount_percent_range_chk;
ALTER TABLE "DoctorAvailability" VALIDATE CONSTRAINT doctor_availability_day_of_week_range_chk;
ALTER TABLE "DoctorAvailability" VALIDATE CONSTRAINT doctor_availability_slot_minutes_positive_chk;
ALTER TABLE "DoctorBlock" VALIDATE CONSTRAINT doctor_block_end_time_gt_start_time_chk;
ALTER TABLE "Payment" VALIDATE CONSTRAINT payment_amount_non_negative_chk;
