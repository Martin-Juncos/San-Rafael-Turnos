CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nota: las tablas se crean por Sequelize sync para el MVP.
-- Este archivo deja explícita la restricción anti doble booking en PostgreSQL.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_unique_active_slot
ON "Appointment" ("doctorId", "date", "startTime")
WHERE status IN ('hold', 'confirmed');
