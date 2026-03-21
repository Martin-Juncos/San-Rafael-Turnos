WITH ranked_links AS (
  SELECT
    "secretaryUserId",
    "doctorId",
    ROW_NUMBER() OVER (PARTITION BY "secretaryUserId" ORDER BY "createdAt" ASC, id ASC) AS row_number
  FROM "SecretaryDoctor"
),
first_link AS (
  SELECT "secretaryUserId", "doctorId"
  FROM ranked_links
  WHERE row_number = 1
)
UPDATE "User" u
SET
  role = 'doctor',
  "doctorId" = first_link."doctorId",
  "updatedAt" = NOW()
FROM first_link
WHERE u.id = first_link."secretaryUserId"
  AND u.role = 'secretary'
  AND u."accountType" = 'secretary';
