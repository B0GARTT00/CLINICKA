-- Non-destructive query-plan fixture. All objects are connection-scoped
-- temporary tables and disappear when this mysql session exits.

CREATE TEMPORARY TABLE PlanNumber AS
SELECT ones.n + tens.n * 10 + hundreds.n * 100 + thousands.n * 1000 AS n
FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) hundreds
CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) thousands;

CREATE TEMPORARY TABLE PlanPatient LIKE Patient;
INSERT INTO PlanPatient (id, patientNumber, type, firstName, lastName, archiveStatus, deletedAt, createdAt, updatedAt)
SELECT CONCAT('plan-p-', LPAD(n, 5, '0')), CONCAT('P-', LPAD(n, 5, '0')), 'STUDENT', CONCAT('First', n), CONCAT('Last', LPAD(MOD(n, 1500), 4, '0')),
       IF(MOD(n, 10) = 0, 'ARCHIVED', 'ACTIVE'), IF(MOD(n, 10) = 0, NOW(), NULL), NOW(), NOW()
FROM PlanNumber;

CREATE TEMPORARY TABLE PlanClinicVisit LIKE ClinicVisit;
INSERT INTO PlanClinicVisit (id, patientId, visitDate, queueNumber, status, archiveStatus, createdAt, updatedAt)
SELECT CONCAT('plan-v-', n, '-', slot), CONCAT('plan-p-', LPAD(n, 5, '0')),
       DATE_ADD('2026-09-01', INTERVAL MOD(n * 4 + slot, 28) DAY), MOD(n, 200) + 1,
       ELT(MOD(n + slot, 4) + 1, 'OPEN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'), 'ACTIVE', NOW(), NOW()
FROM PlanNumber CROSS JOIN (SELECT 0 slot UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) slots;

CREATE TEMPORARY TABLE PlanAppointment LIKE Appointment;
INSERT INTO PlanAppointment (id, patientId, scheduledAt, durationMins, purpose, type, priority, status, createdAt, updatedAt)
SELECT CONCAT('plan-a-', n, '-', slot), CONCAT('plan-p-', LPAD(n, 5, '0')),
       DATE_ADD('2026-09-20', INTERVAL MOD(n * 2 + slot, 45) DAY), 30, 'Consultation', 'CONSULTATION', 'ROUTINE',
       ELT(MOD(n + slot, 4) + 1, 'PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED'), NOW(), NOW()
FROM PlanNumber CROSS JOIN (SELECT 0 slot UNION ALL SELECT 1) slots;

CREATE TEMPORARY TABLE PlanNotification LIKE Notification;
INSERT INTO PlanNotification (id, userId, title, body, type, status, createdAt)
SELECT CONCAT('plan-n-', n, '-', slot), CONCAT('user-', MOD(n, 100)), 'Notice', 'Operational notice', 'SYSTEM',
       IF(MOD(n + slot, 3) = 0, 'READ', 'UNREAD'), DATE_ADD('2026-01-01', INTERVAL n + slot SECOND)
FROM PlanNumber CROSS JOIN (SELECT 0 slot UNION ALL SELECT 1 UNION ALL SELECT 2) slots;

CREATE TEMPORARY TABLE PlanMedicine LIKE Medicine;
INSERT INTO PlanMedicine (id, name, dosageForm, unit, reorderLevel, deletedAt, createdAt, updatedAt)
SELECT CONCAT('plan-m-', n), CONCAT('Medicine ', LPAD(n, 5, '0')), 'Tablet', 'piece', 20,
       IF(MOD(n, 20) = 0, NOW(), NULL), NOW(), NOW() FROM PlanNumber WHERE n < 5000;

CREATE TEMPORARY TABLE PlanMedicineBatch LIKE MedicineBatch;
INSERT INTO PlanMedicineBatch (id, medicineId, batchNumber, expiresAt, quantity, createdAt, updatedAt)
SELECT CONCAT('plan-b-', n, '-', slot), CONCAT('plan-m-', n), CONCAT('B-', slot),
       DATE_ADD('2026-10-01', INTERVAL slot * 30 DAY), 50, NOW(), NOW()
FROM PlanNumber CROSS JOIN (SELECT 0 slot UNION ALL SELECT 1 UNION ALL SELECT 2) slots WHERE n < 5000;

CREATE TEMPORARY TABLE PlanInventoryTransaction LIKE InventoryTransaction;
INSERT INTO PlanInventoryTransaction (id, medicineBatchId, type, quantity, createdAt)
SELECT CONCAT('plan-t-', n, '-', slot), CONCAT('plan-b-', MOD(n, 5000), '-', MOD(slot, 3)),
       IF(MOD(slot, 2) = 0, 'STOCK_IN', 'DISPENSE'), 5, DATE_ADD('2026-01-01', INTERVAL n + slot DAY)
FROM PlanNumber CROSS JOIN (SELECT 0 slot UNION ALL SELECT 1 UNION ALL SELECT 2) slots;

CREATE TEMPORARY TABLE PlanClearance LIKE Clearance;
INSERT INTO PlanClearance (id, patientId, type, academicYearId, status, archiveStatus, createdAt, updatedAt)
SELECT CONCAT('plan-c-', n), CONCAT('plan-p-', LPAD(n, 5, '0')), 'ENROLLMENT', 'plan-ay',
       IF(MOD(n, 5) = 0, 'FOR_REVIEW', 'CLEARED'), 'ACTIVE', NOW(), DATE_ADD('2026-01-01', INTERVAL n MINUTE)
FROM PlanNumber;

CREATE TEMPORARY TABLE PlanAnnouncement LIKE Announcement;
INSERT INTO PlanAnnouncement (id, title, body, audience, status, publishedAt, createdAt, updatedAt)
SELECT CONCAT('plan-an-', n), CONCAT('Announcement ', n), 'Message', 'ALL', 'ACTIVE', NOW(),
       DATE_ADD('2026-01-01', INTERVAL n MINUTE), NOW() FROM PlanNumber;

ANALYZE TABLE PlanPatient, PlanClinicVisit, PlanAppointment, PlanNotification, PlanMedicine,
  PlanMedicineBatch, PlanInventoryTransaction, PlanClearance, PlanAnnouncement;

EXPLAIN SELECT id, lastName, firstName FROM PlanPatient
  WHERE archiveStatus = 'ACTIVE' AND deletedAt IS NULL ORDER BY lastName, firstName LIMIT 20;
EXPLAIN SELECT id, queueNumber FROM PlanClinicVisit
  WHERE status IN ('OPEN', 'IN_CONSULTATION') AND visitDate >= '2026-09-15' AND visitDate < '2026-09-16'
  ORDER BY queueNumber LIMIT 200;
EXPLAIN SELECT COUNT(*) FROM PlanClinicVisit WHERE status = 'COMPLETED';
EXPLAIN SELECT COUNT(*) FROM PlanAppointment
  WHERE status IN ('PENDING', 'APPROVED', 'CONFIRMED') AND scheduledAt >= '2026-09-28';
EXPLAIN SELECT id FROM PlanNotification WHERE userId = 'user-42' ORDER BY createdAt DESC LIMIT 100;
EXPLAIN SELECT id, name FROM PlanMedicine WHERE deletedAt IS NULL ORDER BY name;
EXPLAIN SELECT id FROM PlanMedicineBatch WHERE medicineId = 'plan-m-42' ORDER BY expiresAt;
EXPLAIN SELECT id FROM PlanInventoryTransaction WHERE createdAt >= '2026-09-01' ORDER BY createdAt DESC LIMIT 250;
EXPLAIN SELECT id FROM PlanClearance WHERE status = 'FOR_REVIEW' ORDER BY updatedAt DESC;
EXPLAIN SELECT id FROM PlanAnnouncement ORDER BY createdAt DESC LIMIT 100;
