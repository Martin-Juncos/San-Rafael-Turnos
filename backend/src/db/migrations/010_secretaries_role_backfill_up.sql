UPDATE "User"
SET
  role = 'secretary',
  "doctorId" = NULL,
  "updatedAt" = NOW()
WHERE role = 'doctor'
  AND "accountType" = 'secretary';
