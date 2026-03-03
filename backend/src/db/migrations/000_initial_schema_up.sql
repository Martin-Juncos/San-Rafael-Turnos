-- Baseline DDL for fresh schemas.
-- This migration is the source of truth for creating the full schema without sequelize.sync.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_User_role'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_User_role" AS ENUM ('admin', 'clinic', 'doctor');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_User_accountType'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_User_accountType" AS ENUM ('staff', 'doctor', 'secretary');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_DoctorBlock_createdByRole'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_DoctorBlock_createdByRole" AS ENUM ('admin', 'clinic');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_Appointment_status'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_Appointment_status" AS ENUM (
      'requested',
      'hold',
      'confirmed',
      'cancelled',
      'rescheduled',
      'attended',
      'no_show'
    );
  END IF;
END
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_Payment_provider'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_Payment_provider" AS ENUM ('mock', 'mercadopago', 'stripe');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_Payment_status'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_Payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_PaymentWebhookEvent_provider'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_PaymentWebhookEvent_provider" AS ENUM ('mercadopago');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_Message_senderRole'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_Message_senderRole" AS ENUM ('doctor', 'patient', 'clinic');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_ConsultNote_statusFinal'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_ConsultNote_statusFinal" AS ENUM ('attended', 'no_show', 'requires_reschedule');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'enum_ConsultNote_nextSuggestedType'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "enum_ConsultNote_nextSuggestedType" AS ENUM ('date', 'as_needed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Specialty" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT specialty_name_uq UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS "HealthInsurance" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT healthinsurance_discount_percent_range_base_chk
    CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100)
);

CREATE TABLE IF NOT EXISTS "Doctor" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fullName" VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  dni VARCHAR(255),
  consultorio INTEGER NOT NULL DEFAULT 1,
  "specialtyId" UUID NOT NULL,
  bio TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT doctor_email_uq UNIQUE (email),
  CONSTRAINT doctor_dni_uq UNIQUE (dni),
  CONSTRAINT doctor_consultorio_positive_base_chk CHECK (consultorio >= 1),
  CONSTRAINT doctor_specialty_id_fk_base
    FOREIGN KEY ("specialtyId")
    REFERENCES "Specialty"(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Patient" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  "streetAndNumber" VARCHAR(255),
  city VARCHAR(255),
  "birthDate" DATE,
  email VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT patient_dni_uq UNIQUE (dni)
);

CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role "enum_User_role" NOT NULL,
  "accountType" "enum_User_accountType" NOT NULL DEFAULT 'staff',
  email VARCHAR(255) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "doctorId" UUID,
  "fullName" VARCHAR(255),
  phone VARCHAR(255),
  dni VARCHAR(255),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_email_uq UNIQUE (email),
  CONSTRAINT user_doctor_id_fk_base
    FOREIGN KEY ("doctorId")
    REFERENCES "Doctor"(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "replacedByTokenId" UUID,
  "createdByIp" VARCHAR(255),
  "userAgent" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT refreshtoken_token_hash_uq UNIQUE ("tokenHash"),
  CONSTRAINT refreshtoken_user_id_fk_base
    FOREIGN KEY ("userId")
    REFERENCES "User"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DoctorAvailability" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "doctorId" UUID NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  "slotMinutes" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT doctoravailability_doctor_id_fk_base
    FOREIGN KEY ("doctorId")
    REFERENCES "Doctor"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DoctorBlock" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "doctorId" UUID NOT NULL,
  date DATE NOT NULL,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  reason VARCHAR(255),
  "createdByRole" "enum_DoctorBlock_createdByRole" NOT NULL,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT doctorblock_doctor_id_fk_base
    FOREIGN KEY ("doctorId")
    REFERENCES "Doctor"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Appointment" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "doctorId" UUID NOT NULL,
  "specialtyId" UUID NOT NULL,
  "insuranceId" UUID,
  "patientId" UUID NOT NULL,
  date DATE NOT NULL,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  symptoms TEXT,
  "doctorNotes" TEXT,
  status "enum_Appointment_status" NOT NULL DEFAULT 'requested',
  "cancelReason" VARCHAR(255),
  "discountPercentApplied" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "createdByRole" "enum_Appointment_createdByRole" NOT NULL,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT appointment_doctor_id_fk_base
    FOREIGN KEY ("doctorId")
    REFERENCES "Doctor"(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT appointment_specialty_id_fk_base
    FOREIGN KEY ("specialtyId")
    REFERENCES "Specialty"(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT appointment_insurance_id_fk_base
    FOREIGN KEY ("insuranceId")
    REFERENCES "HealthInsurance"(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT appointment_patient_id_fk_base
    FOREIGN KEY ("patientId")
    REFERENCES "Patient"(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Payment" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "appointmentId" UUID NOT NULL,
  provider "enum_Payment_provider" NOT NULL DEFAULT 'mock',
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status "enum_Payment_status" NOT NULL DEFAULT 'pending',
  "externalRef" VARCHAR(255),
  "preferenceId" VARCHAR(255),
  "providerPaymentId" VARCHAR(255),
  "providerStatus" VARCHAR(255),
  "lastWebhookPayload" JSONB,
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_appointment_id_uq UNIQUE ("appointmentId"),
  CONSTRAINT payment_appointment_id_fk_base
    FOREIGN KEY ("appointmentId")
    REFERENCES "Appointment"(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "paymentId" UUID NOT NULL,
  provider "enum_PaymentWebhookEvent_provider" NOT NULL DEFAULT 'mercadopago',
  "providerPaymentId" VARCHAR(255) NOT NULL,
  "providerStatus" VARCHAR(255) NOT NULL,
  "preferenceId" VARCHAR(255),
  "externalReference" VARCHAR(255),
  "webhookEventId" VARCHAR(255),
  "webhookTopic" VARCHAR(255),
  "webhookAction" VARCHAR(255),
  payload JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_webhook_event_webhook_event_id_uq UNIQUE ("webhookEventId"),
  CONSTRAINT payment_webhook_event_dedupe_uq UNIQUE (provider, "paymentId", "providerPaymentId", "providerStatus"),
  CONSTRAINT payment_webhook_event_payment_id_fk_base
    FOREIGN KEY ("paymentId")
    REFERENCES "Payment"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Message" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "appointmentId" UUID NOT NULL,
  "senderRole" "enum_Message_senderRole" NOT NULL,
  "senderId" UUID,
  body TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_appointment_id_fk_base
    FOREIGN KEY ("appointmentId")
    REFERENCES "Appointment"(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actorRole" VARCHAR(255) NOT NULL,
  "actorId" UUID,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255) NOT NULL,
  "entityId" UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PatientOtp" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  "codeHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ConsultNote" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "appointmentId" UUID NOT NULL,
  "doctorId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  subjective TEXT NOT NULL,
  objective TEXT,
  assessment TEXT,
  plan TEXT NOT NULL,
  "followUp" TEXT,
  "internalNotes" TEXT,
  "statusFinal" "enum_ConsultNote_statusFinal" NOT NULL DEFAULT 'attended',
  referred BOOLEAN NOT NULL DEFAULT FALSE,
  "referralTo" VARCHAR(250),
  "nextSuggestedType" "enum_ConsultNote_nextSuggestedType",
  "nextSuggestedDate" DATE,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT consultnote_appointment_id_uq UNIQUE ("appointmentId"),
  CONSTRAINT consultnote_appointment_id_fk_base
    FOREIGN KEY ("appointmentId")
    REFERENCES "Appointment"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT consultnote_doctor_id_fk_base
    FOREIGN KEY ("doctorId")
    REFERENCES "Doctor"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT consultnote_patient_id_fk_base
    FOREIGN KEY ("patientId")
    REFERENCES "Patient"(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_role_account_type_idx
  ON "User" (role, "accountType");

CREATE INDEX IF NOT EXISTS user_doctor_id_idx
  ON "User" ("doctorId");

CREATE INDEX IF NOT EXISTS refreshtoken_user_id_idx
  ON "RefreshToken" ("userId");

CREATE INDEX IF NOT EXISTS refreshtoken_expires_at_idx
  ON "RefreshToken" ("expiresAt");

CREATE INDEX IF NOT EXISTS doctor_specialty_active_idx
  ON "Doctor" ("specialtyId")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS doctoravailability_doctor_day_idx
  ON "DoctorAvailability" ("doctorId", "dayOfWeek");

CREATE INDEX IF NOT EXISTS doctorblock_doctor_date_idx
  ON "DoctorBlock" ("doctorId", date);

CREATE INDEX IF NOT EXISTS patientotp_dni_idx
  ON "PatientOtp" (dni);

CREATE INDEX IF NOT EXISTS patientotp_expires_at_idx
  ON "PatientOtp" ("expiresAt");

CREATE INDEX IF NOT EXISTS appointment_doctor_date_idx
  ON "Appointment" ("doctorId", date);

CREATE INDEX IF NOT EXISTS appointment_patient_date_idx
  ON "Appointment" ("patientId", date);

CREATE INDEX IF NOT EXISTS appointment_status_idx
  ON "Appointment" (status);

CREATE INDEX IF NOT EXISTS appointment_hold_created_idx
  ON "Appointment" (status, "createdAt")
  WHERE status = 'hold' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS appointment_doctor_date_time_status_idx
  ON "Appointment" ("doctorId", date, "startTime", status)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS appointment_patient_status_date_idx
  ON "Appointment" ("patientId", status, date, "startTime")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS appointment_doctor_status_date_idx
  ON "Appointment" ("doctorId", status, date, "startTime")
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS appointment_unique_active_slot
  ON "Appointment" ("doctorId", date, "startTime")
  WHERE status IN ('hold', 'confirmed');

CREATE INDEX IF NOT EXISTS payment_status_idx
  ON "Payment" (status);

CREATE INDEX IF NOT EXISTS payment_provider_payment_id_idx
  ON "Payment" ("providerPaymentId");

CREATE INDEX IF NOT EXISTS payment_webhook_event_payment_idx
  ON "PaymentWebhookEvent" ("paymentId");

CREATE INDEX IF NOT EXISTS message_appointment_created_at_idx
  ON "Message" ("appointmentId", "createdAt");

CREATE INDEX IF NOT EXISTS consultnote_doctor_created_at_idx
  ON "ConsultNote" ("doctorId", "createdAt");

CREATE INDEX IF NOT EXISTS consultnote_patient_created_at_idx
  ON "ConsultNote" ("patientId", "createdAt");

CREATE INDEX IF NOT EXISTS doctor_block_doctor_date_start_idx
  ON "DoctorBlock" ("doctorId", date, "startTime");

CREATE UNIQUE INDEX IF NOT EXISTS healthinsurance_unique_name_discount_active
  ON "HealthInsurance" (LOWER(name), "discountPercent")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS healthinsurance_name_idx
  ON "HealthInsurance" (name);

CREATE INDEX IF NOT EXISTS healthinsurance_discount_percent_idx
  ON "HealthInsurance" ("discountPercent");

CREATE INDEX IF NOT EXISTS audit_log_entity_action_created_at_idx
  ON "AuditLog" (entity, action, "createdAt" DESC);
