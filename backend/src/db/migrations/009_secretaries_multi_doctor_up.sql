DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'enum_User_role'
      AND n.nspname = current_schema()
      AND e.enumlabel = 'secretary'
  ) THEN
    ALTER TYPE "enum_User_role" ADD VALUE 'secretary';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SecretaryDoctor" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "secretaryUserId" UUID NOT NULL,
  "doctorId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT secretarydoctor_secretary_user_id_fk
    FOREIGN KEY ("secretaryUserId")
    REFERENCES "User"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT secretarydoctor_doctor_id_fk
    FOREIGN KEY ("doctorId")
    REFERENCES "Doctor"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT secretarydoctor_secretary_doctor_uq
    UNIQUE ("secretaryUserId", "doctorId")
);

CREATE INDEX IF NOT EXISTS secretarydoctor_doctor_id_idx
  ON "SecretaryDoctor" ("doctorId");

INSERT INTO "SecretaryDoctor" (id, "secretaryUserId", "doctorId", "createdAt", "updatedAt")
SELECT
  uuid_generate_v4(),
  u.id,
  u."doctorId",
  NOW(),
  NOW()
FROM "User" u
WHERE u.role = 'doctor'
  AND u."accountType" = 'secretary'
  AND u."doctorId" IS NOT NULL
ON CONFLICT ("secretaryUserId", "doctorId") DO NOTHING;
