DROP INDEX IF EXISTS appointment_doctor_date_time_status_idx;
DROP INDEX IF EXISTS appointment_hold_created_idx;
DROP INDEX IF EXISTS doctor_specialty_active_idx;
DROP INDEX IF EXISTS "healthinsurance_unique_name_discount_active";

ALTER TABLE "Payment"
  DROP CONSTRAINT IF EXISTS payment_amount_non_negative_chk;

ALTER TABLE "DoctorBlock"
  DROP CONSTRAINT IF EXISTS doctor_block_end_time_gt_start_time_chk;

ALTER TABLE "DoctorAvailability"
  DROP CONSTRAINT IF EXISTS doctor_availability_slot_minutes_positive_chk;

ALTER TABLE "DoctorAvailability"
  DROP CONSTRAINT IF EXISTS doctor_availability_day_of_week_range_chk;

ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_discount_percent_range_chk;

ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS appointment_end_time_gt_start_time_chk;
