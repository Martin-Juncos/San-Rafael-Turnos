ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_discount_percent_range_chk;

ALTER TABLE "Appointment"
  DROP COLUMN IF EXISTS "discountPercentApplied",
  DROP COLUMN IF EXISTS "createdByRole",
  DROP COLUMN IF EXISTS "createdByUserId";

ALTER TABLE "Message"
  DROP COLUMN IF EXISTS "senderId";

DROP TABLE IF EXISTS "PatientOtp";

DROP TYPE IF EXISTS "enum_Appointment_createdByRole";
