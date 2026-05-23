UPDATE "misconception"
SET "active" = true
WHERE "status" IN ('candidate', 'confirmed')
  AND "active" = false;

UPDATE "misconception"
SET "active" = false
WHERE "status" IN ('decayed', 'resolved')
  AND "active" = true;
