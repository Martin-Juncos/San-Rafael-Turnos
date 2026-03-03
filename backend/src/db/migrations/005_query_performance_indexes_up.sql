-- Safe migration: add read/query indexes for high-traffic backend filters.

CREATE INDEX IF NOT EXISTS appointment_patient_status_date_idx
  ON "Appointment" ("patientId", status, date, "startTime")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS appointment_doctor_status_date_idx
  ON "Appointment" ("doctorId", status, date, "startTime")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS doctor_block_doctor_date_start_idx
  ON "DoctorBlock" ("doctorId", date, "startTime");

CREATE INDEX IF NOT EXISTS audit_log_entity_action_created_at_idx
  ON "AuditLog" (entity, action, "createdAt" DESC);
