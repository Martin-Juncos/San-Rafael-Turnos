-- Safe migration: protect historical data by avoiding cascaded deletes
-- over appointments/payments/messages when parent entities are hard-deleted.

DO $$
DECLARE row_item RECORD;
BEGIN
  FOR row_item IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = current_schema()
      AND tc.table_name = 'Appointment'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name IN ('doctorId', 'patientId', 'specialtyId')
  LOOP
    EXECUTE format('ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS %I;', row_item.constraint_name);
  END LOOP;
END
$$;

DO $$
DECLARE row_item RECORD;
BEGIN
  FOR row_item IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = current_schema()
      AND tc.table_name = 'Payment'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'appointmentId'
  LOOP
    EXECUTE format('ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS %I;', row_item.constraint_name);
  END LOOP;
END
$$;

DO $$
DECLARE row_item RECORD;
BEGIN
  FOR row_item IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = current_schema()
      AND tc.table_name = 'Message'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'appointmentId'
  LOOP
    EXECUTE format('ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS %I;', row_item.constraint_name);
  END LOOP;
END
$$;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_doctor_id_fk_restrict
  FOREIGN KEY ("doctorId")
  REFERENCES "Doctor"(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_patient_id_fk_restrict
  FOREIGN KEY ("patientId")
  REFERENCES "Patient"(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_specialty_id_fk_restrict
  FOREIGN KEY ("specialtyId")
  REFERENCES "Specialty"(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE "Payment"
  ADD CONSTRAINT payment_appointment_id_fk_restrict
  FOREIGN KEY ("appointmentId")
  REFERENCES "Appointment"(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE "Message"
  ADD CONSTRAINT message_appointment_id_fk_restrict
  FOREIGN KEY ("appointmentId")
  REFERENCES "Appointment"(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
