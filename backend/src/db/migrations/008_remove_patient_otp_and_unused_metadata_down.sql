DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_Appointment_createdByRole'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_Appointment_createdByRole" AS ENUM ('admin', 'clinic', 'doctor', 'patient');
  END IF;
END
$$;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "discountPercentApplied" NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "createdByRole" "enum_Appointment_createdByRole" NOT NULL DEFAULT 'clinic',
  ADD COLUMN IF NOT EXISTS "createdByUserId" UUID;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_discount_percent_range_chk
  CHECK ("discountPercentApplied" >= 0 AND "discountPercentApplied" <= 100) NOT VALID;

ALTER TABLE "Appointment"
  VALIDATE CONSTRAINT appointment_discount_percent_range_chk;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "senderId" UUID;

CREATE TABLE IF NOT EXISTS "PatientOtp" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  "codeHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patientotp_dni_idx
  ON "PatientOtp" (dni);

CREATE INDEX IF NOT EXISTS patientotp_expires_at_idx
  ON "PatientOtp" ("expiresAt");
