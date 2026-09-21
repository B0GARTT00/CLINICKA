# BCHealth Database ERD

## Users / Authentication

```
User (id PK, email, passwordHash, displayName, status, patientId FK?, createdAt, updatedAt, deletedAt)
  ├── UserRole (userId PK/FK, roleId PK/FK)
  │     └── Role (id PK, name, description, createdAt, updatedAt)
  │           └── RolePermission (roleId PK/FK, permissionId PK/FK)
  │                 └── Permission (id PK, key, description, createdAt, updatedAt)
  ├── RefreshToken (id PK, userId FK, tokenHash, expiresAt, revokedAt, createdAt)
  ├── AuditLog (id PK, actorId FK?, action, entity, entityId, ipAddress, userAgent, metadata, createdAt)
  ├── Appointment.assignedToId FK
  ├── ClinicVisit.clinicianId FK
  ├── VitalSign.recordedById FK
  ├── Consultation.clinicianId FK
  ├── RequirementSubmission.reviewerId FK
  ├── Clearance.issuedById FK
  ├── VaccinationRecord.administeredById FK
  ├── HealthScreening.screenedById FK
  ├── MedicineDispensation.dispensedById FK
  ├── MedicalCertificate.issuedById FK
  ├── Document.createdById FK
  ├── Announcement.createdById FK
  ├── InventoryTransaction.actorId FK
  └── EmergencyCase.attendedById FK
```

## Patients

```
Patient (id PK, patientNumber UK, type, firstName, middleName?, lastName, suffix?, email UK?, phone?, birthDate?, sex?, address?, archiveStatus, createdAt, updatedAt, deletedAt)
  ├── StudentProfile (id PK, patientId UK/FK, studentId UK, program, yearLevel?, section?)
  ├── EmployeeProfile (id PK, patientId UK/FK, employeeId UK, department, position?)
  ├── EmergencyContact (id PK, patientId FK, name, relationship, phone, address?, createdAt)
  ├── MedicalHistory (id PK, patientId FK, summary, notes?, recordedAt, isActive)
  ├── MedicalCondition (id PK, patientId FK, name, diagnosedAt?, resolvedAt?, notes?, isActive)
  ├── Allergy (id PK, patientId FK, allergen, reaction?, severity?, notes?, isActive)
  ├── ClinicVisit (id PK, patientId FK, clinicianId FK?, visitDate, chiefComplaint?, status, notes?, archiveStatus, createdAt, updatedAt)
  │     ├── VitalSign (id PK, clinicVisitId FK, recordedById FK?, temperatureC?, systolicBp?, diastolicBp?, pulseRate?, respiratoryRate?, oxygenSaturation?, heightCm?, weightKg?, recordedAt)
  │     ├── Consultation (id PK, clinicVisitId FK, clinicianId FK?, subjective?, objective?, assessment?, plan?, createdAt, updatedAt)
  │     │     ├── Diagnosis (id PK, consultationId FK, code?, description, notes?, createdAt)
  │     │     ├── Treatment (id PK, consultationId FK, description, notes?, createdAt)
  │     │     └── Prescription (id PK, consultationId FK, instructions?, createdAt)
  │     │           └── PrescriptionItem (id PK, prescriptionId FK, medicineName, dosage, frequency, duration?, quantity?)
  │     └── EmergencyCase (id PK, patientId FK, clinicVisitId FK?, occurredAt, emergencyType, description, actionTaken, treatment?, disposition?, attendedById FK?, remarks?, createdAt, updatedAt)
  ├── Appointment (id PK, patientId FK, assignedToId FK?, scheduledAt, durationMins, purpose, type, priority, status, notes?, cancellationReason?, createdAt, updatedAt)
  ├── RequirementSubmission (id PK, requirementId FK, patientId FK, documentId FK?, status, submittedAt, reviewedAt?, reviewerId FK?, expiresAt?, notes?, createdAt, updatedAt)
  ├── Clearance (id PK, patientId FK, type, academicYearId FK, semesterId FK?, status, remarks?, issuedById FK?, issuedAt?, expiresAt?, archiveStatus, createdAt, updatedAt)
  ├── VaccinationRecord (id PK, patientId FK, vaccineName, dose, administeredAt, manufacturer?, lotNumber?, administeredById FK?, remarks?, nextDoseAt?, createdAt, updatedAt)
  ├── HealthScreening (id PK, patientId FK, screeningType, screenedAt, result, findings?, recommendations?, screenedById FK?, createdAt, updatedAt)
  ├── MedicineDispensation (id PK, patientId FK, clinicVisitId FK?, dispensedById FK?, notes?, createdAt)
  │     └── MedicineDispensationItem (id PK, dispensationId FK, medicineBatchId FK, quantity, instructions?)
  ├── MedicalCertificate (id PK, patientId FK, type, purpose, issuedAt, validUntil?, issuedById FK?, remarks?, documentId UK?, createdAt, updatedAt)
  └── Document (id PK, patientId FK?, filename, mimeType, storageKey, sizeBytes, isPrivate, submissions?, certificate?, createdById FK?, createdAt)
```

## Academic Calendar

```
AcademicYear (id PK, label UK, startsAt, endsAt, isActive, createdAt, updatedAt)
  └── Semester (id PK, academicYearId FK, term, label, startsAt, endsAt, isActive, [academicYearId, term] UK)
        ├── HealthRequirement (id PK, name, description?, applicableTo, academicYearId FK, semesterId FK?, deadline?, submissions?, archiveStatus, createdAt, updatedAt)
        └── Clearance (id PK, patientId FK, type, academicYearId FK, semesterId FK?, status, remarks?, issuedById FK?, issuedAt?, expiresAt?, archiveStatus, createdAt, updatedAt)
```

## Inventory

```
Medicine (id PK, name, genericName?, brand?, dosageForm, unit, reorderLevel, batches?, createdAt, updatedAt, deletedAt)
  └── MedicineBatch (id PK, medicineId FK, [medicineId, batchNumber] UK, expiresAt, quantity, supplier?, transactions?, dispensationItems?, createdAt, updatedAt)
        └── InventoryTransaction (id PK, medicineBatchId FK, type, quantity, reason?, actorId FK?, createdAt)
```

## Notifications / Announcements / Archive / System

```
Notification (id PK, userId FK, title, body, type, status, metadata?, createdAt)
Announcement (id PK, title, body, audience, status, publishedAt?, expiresAt?, createdById FK?, createdAt, updatedAt)
Archive (id PK, recordType, recordId, data, archivedBy FK?, archivedAt, restoredAt?, reason?, createdAt)
SystemSetting (id PK, key UK, value, category?, updatedBy?, createdAt, updatedAt)
```
