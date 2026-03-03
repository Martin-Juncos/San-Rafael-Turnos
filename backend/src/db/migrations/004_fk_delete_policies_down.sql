-- Rollback to original cascade behavior used before hardening.

ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_doctor_id_fk_restrict;

ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_patient_id_fk_restrict;

ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_specialty_id_fk_restrict;

ALTER TABLE "Payment"
  DROP CONSTRAINT IF EXISTS payment_appointment_id_fk_restrict;

ALTER TABLE "Message"
  DROP CONSTRAINT IF EXISTS message_appointment_id_fk_restrict;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_doctor_id_fk_cascade
  FOREIGN KEY ("doctorId")
  REFERENCES "Doctor"(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_patient_id_fk_cascade
  FOREIGN KEY ("patientId")
  REFERENCES "Patient"(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_specialty_id_fk_cascade
  FOREIGN KEY ("specialtyId")
  REFERENCES "Specialty"(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT payment_appointment_id_fk_cascade
  FOREIGN KEY ("appointmentId")
  REFERENCES "Appointment"(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT message_appointment_id_fk_cascade
  FOREIGN KEY ("appointmentId")
  REFERENCES "Appointment"(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
