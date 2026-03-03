# DB Schema Audit - San Rafael Turnos

Fecha de auditoria (UTC): 2026-03-03T16:54:20.419Z

## Resumen ejecutivo

- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- Base de datos: san_rafael_turnos
- Esquema: public

Hallazgos principales:
- Sin hallazgos criticos/altos/medios activos en esta corrida.

## Diagrama logico (texto) del modelo recomendado

- users (admin/clinic/doctor/secretary) -> doctor (opcional 1:1 para cuentas de medico)
- specialties 1:N doctors
- doctors 1:N doctor_availability
- doctors 1:N doctor_blocks
- patients 1:N appointments
- doctors 1:N appointments
- specialties 1:N appointments
- appointments 1:1 payments
- appointments 1:N messages (opcional)
- appointments 1:1 consult_notes (post consulta)
- audit_logs para trazabilidad de operaciones criticas

Flujo critico esperado:
- disponibilidad -> reserva -> hold temporal -> pago -> confirmacion

## Esperado vs Actual

| Entidad esperada | Tabla | Requerida | Estado | Notas |
|---|---|---|---|---|
| specialties | Specialty | Yes | Present | Catalogo de especialidades |
| doctors | Doctor | Yes | Present | Profesionales medicos |
| doctor_availability | DoctorAvailability | Yes | Present | Agenda base semanal |
| doctor_blocks | DoctorBlock | No | Present | Bloqueos puntuales de agenda |
| patients | Patient | Yes | Present | Pacientes |
| appointments | Appointment | Yes | Present | Turnos y estado del flujo |
| payments | Payment | Yes | Present | Pagos por turno |
| users | User | Yes | Present | RBAC administrativo/medico |
| messages | Message | No | Present | Mensajeria vinculada al turno |
| audit_logs | AuditLog | No | Present | Trazabilidad operativa |

## Hallazgos por categoria

### Tablas

- Total de tablas en `public`: 16
- Tablas sin PK: ninguna

### Relaciones (FK)

- Total FK: 15
- Todas las relaciones clave del dominio existen (doctor/patient/specialty/payment).
- Riesgo de borrado en cascada detectado en relaciones de negocio:
  - ConsultNote.appointmentId -> Appointment.id (CASCADE)
  - ConsultNote.doctorId -> Doctor.id (CASCADE)
  - ConsultNote.patientId -> Patient.id (CASCADE)

### Restricciones

- UNIQUE/CHECK/FK/PK presentes, pero con degradacion por duplicados:
  - Firmas de indices duplicadas: 0
  - Firmas de constraints duplicadas: 0
- CHECK constraints definidos: 6

### Indices

| Tabla | Patron evaluado | Cobertura |
|---|---|---|
| Appointment | appointments por doctor + fecha/rango | Yes |
| Appointment | appointments por status | Yes |
| Doctor | doctors por specialty | Yes |
| Patient | patients por dni | Yes |
| Payment | payments por appointment_id | Yes |
| Message | messages por appointment_id | Yes |

### Concurrencia

- Indice unico parcial anti doble booking (`appointment_unique_active_slot`): Presente
- Locking transaccional en app (`LOCK.UPDATE` en servicio de turnos): Detectado
- Doble booking activo detectado: 0
- Holds vencidos no liberados: 0

## Riesgos y severidad

| Severidad | Categoria | Riesgo | Evidencia |
|---|---|---|---|
| Low | General | Sin hallazgos relevantes | Sin evidencia de riesgo |

## Plan de remediacion por etapas

### MVP-safe

1. Eliminar duplicados de constraints e indices sin tocar datos.
2. Agregar indices faltantes para consultas de agenda y filtros principales.
3. Incorporar CHECK constraints con `NOT VALID` y posterior `VALIDATE`.
4. Programar job de liberacion de holds vencidos (cron cada 1 minuto o trigger de limpieza previa).

### Post-MVP

1. Revisar politicas `ON DELETE` para evitar perdida historica de turnos/pagos.
2. Migrar desde `sequelize.sync({ alter: true })` hacia migraciones versionadas deterministicas.
3. Agregar monitoreo de salud de esquema (alerta por nuevos duplicados en constraints/indexes).

## Remediacion aplicada (estado en DB auditada)

- 001_init (2026-03-03T14:51:37.890Z)
- 002_schema_audit_cleanup_duplicates (2026-03-03T14:51:37.903Z)
- 003_schema_audit_hardening (2026-03-03T14:51:38.244Z)
- 004_fk_delete_policies (2026-03-03T14:51:38.259Z)

## Validaciones de consistencia (conteos)

| Check | Severidad | Registros afectados |
|---|---|---|
| orphan_appointments_doctor | High | 0 |
| orphan_appointments_patient | High | 0 |
| orphan_payments | Critical | 0 |
| duplicate_payments_per_appointment | Critical | 0 |
| confirmed_without_paid_payment | High | 0 |
| expired_holds_not_released | High | 0 |
| double_booking_active_slot | Critical | 0 |
| duplicate_patients_dni | High | 0 |
| duplicate_doctors_email | High | 0 |
| duplicate_users_email | High | 0 |

## Muestras (max 20)

### orphan_appointments_doctor

```json
[]
```

### orphan_appointments_patient

```json
[]
```

### orphan_payments

```json
[]
```

### duplicate_payments_per_appointment

```json
[]
```

### confirmed_without_paid_payment

```json
[]
```

### expired_holds_not_released

```json
[]
```

### double_booking_active_slot

```json
[]
```

### duplicate_patients_dni

```json
[]
```

### duplicate_doctors_email

```json
[]
```

### duplicate_users_email

```json
[]
```

## Apendice: queries ejecutadas

### orphan_appointments_doctor

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      LEFT JOIN "Doctor" d ON d.id = a."doctorId"
      WHERE d.id IS NULL;
```

Sample SQL:
```sql
SELECT a.id, a."doctorId", a.date, a."startTime", a.status
      FROM "Appointment" a
      LEFT JOIN "Doctor" d ON d.id = a."doctorId"
      WHERE d.id IS NULL
      LIMIT 20;
```

### orphan_appointments_patient

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON p.id = a."patientId"
      WHERE p.id IS NULL;
```

Sample SQL:
```sql
SELECT a.id, a."patientId", a.date, a."startTime", a.status
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON p.id = a."patientId"
      WHERE p.id IS NULL
      LIMIT 20;
```

### orphan_payments

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM "Payment" p
      LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
      WHERE a.id IS NULL;
```

Sample SQL:
```sql
SELECT p.id, p."appointmentId", p.status
      FROM "Payment" p
      LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
      WHERE a.id IS NULL
      LIMIT 20;
```

### duplicate_payments_per_appointment

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM (
        SELECT "appointmentId"
        FROM "Payment"
        GROUP BY "appointmentId"
        HAVING COUNT(*) > 1
      ) dup;
```

Sample SQL:
```sql
SELECT "appointmentId", COUNT(*) AS payment_count
      FROM "Payment"
      GROUP BY "appointmentId"
      HAVING COUNT(*) > 1
      ORDER BY payment_count DESC
      LIMIT 20;
```

### confirmed_without_paid_payment

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      LEFT JOIN "Payment" p ON p."appointmentId" = a.id
      WHERE a.status='confirmed'
        AND (p.id IS NULL OR p.status <> 'paid');
```

Sample SQL:
```sql
SELECT a.id, a.status AS appointment_status, p.status AS payment_status, a.date, a."startTime"
      FROM "Appointment" a
      LEFT JOIN "Payment" p ON p."appointmentId" = a.id
      WHERE a.status='confirmed'
        AND (p.id IS NULL OR p.status <> 'paid')
      LIMIT 20;
```

### expired_holds_not_released

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      WHERE a.status='hold'
        AND a."createdAt" < NOW() - INTERVAL '10 minutes';
```

Sample SQL:
```sql
SELECT a.id, a.status, a."createdAt", a.date, a."startTime"
      FROM "Appointment" a
      WHERE a.status='hold'
        AND a."createdAt" < NOW() - INTERVAL '10 minutes'
      ORDER BY a."createdAt" ASC
      LIMIT 20;
```

### double_booking_active_slot

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM (
        SELECT "doctorId", date, "startTime"
        FROM "Appointment"
        WHERE status IN ('hold', 'confirmed')
          AND "deletedAt" IS NULL
        GROUP BY "doctorId", date, "startTime"
        HAVING COUNT(*) > 1
      ) dup;
```

Sample SQL:
```sql
SELECT "doctorId", date, "startTime", COUNT(*) AS active_count,
             array_agg(id ORDER BY "createdAt") AS appointment_ids
      FROM "Appointment"
      WHERE status IN ('hold', 'confirmed')
        AND "deletedAt" IS NULL
      GROUP BY "doctorId", date, "startTime"
      HAVING COUNT(*) > 1
      ORDER BY active_count DESC
      LIMIT 20;
```

### duplicate_patients_dni

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM (
        SELECT dni
        FROM "Patient"
        GROUP BY dni
        HAVING COUNT(*) > 1
      ) dup;
```

Sample SQL:
```sql
SELECT dni, COUNT(*) AS patient_count, array_agg(id ORDER BY "createdAt") AS patient_ids
      FROM "Patient"
      GROUP BY dni
      HAVING COUNT(*) > 1
      ORDER BY patient_count DESC
      LIMIT 20;
```

### duplicate_doctors_email

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM (
        SELECT LOWER(email)
        FROM "Doctor"
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      ) dup;
```

Sample SQL:
```sql
SELECT LOWER(email) AS email_norm, COUNT(*) AS doctor_count, array_agg(id ORDER BY "createdAt") AS doctor_ids
      FROM "Doctor"
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY doctor_count DESC
      LIMIT 20;
```

### duplicate_users_email

Count SQL:
```sql
SELECT COUNT(*)::int AS total
      FROM (
        SELECT LOWER(email)
        FROM "User"
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      ) dup;
```

Sample SQL:
```sql
SELECT LOWER(email) AS email_norm, COUNT(*) AS user_count, array_agg(id ORDER BY "createdAt") AS user_ids
      FROM "User"
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY user_count DESC
      LIMIT 20;
```
