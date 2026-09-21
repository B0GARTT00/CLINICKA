# BCHealth Database Documentation

## Overview

The BCHealth database is a MySQL database managed through Prisma ORM. It covers all domain areas required by the BCHealth clinic information and records management system.

## Domain Areas

### 1. Users & Authentication

| Model | Purpose |
|-------|---------|
| `User` | System accounts (admin, clinic staff, doctors, students, faculty) |
| `Role` | RBAC roles (ADMINISTRATOR, CLINIC_NURSE, DOCTOR, etc.) |
| `Permission` | Granular permissions (e.g., `patients.read`, `clinical.manage`) |
| `UserRole` | Many-to-many user ↔ role |
| `RolePermission` | Many-to-many role ↔ permission |
| `RefreshToken` | JWT refresh token hashes with revocation support |
| `AuditLog` | Immutable action log (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.) |

**Key design choices:**
- Passwords stored as hashes only (`passwordHash`)
- Soft delete on `User` via `deletedAt`
- Users may optionally link to a `Patient` record (`patientId`)
- `AuditLog.actorId` uses `onDelete: SetNull` so historical logs are preserved if a user is removed

### 2. Patients

| Model | Purpose |
|-------|---------|
| `Patient` | Core patient demographics |
| `StudentProfile` | Optional student-specific data (student ID, program, year level) |
| `EmployeeProfile` | Optional employee-specific data (employee ID, department) |
| `EmergencyContact` | Guardian/emergency contact information |
| `MedicalHistory` | Historical medical summaries |
| `MedicalCondition` | Chronic conditions with active/resolved tracking |
| `Allergy` | Allergen records with severity and reaction |

**Key design choices:**
- `patientNumber` is unique and used as the official patient identifier
- `sex` uses a typed `Sex` enum
- Patient type (`STUDENT`, `FACULTY`, `STAFF`) drives profile branching
- Soft delete preserves historical records
- One-to-one profiles (`StudentProfile`, `EmployeeProfile`) use `onDelete: Cascade`

### 3. Clinical

| Model | Purpose |
|-------|---------|
| `ClinicVisit` | A single patient visit to the clinic |
| `VitalSign` | Vitals recorded during a visit |
| `Consultation` | Clinical assessment linked to a visit |
| `Diagnosis` | Diagnoses within a consultation |
| `Treatment` | Treatment plans within a consultation |
| `Prescription` | Prescription header |
| `PrescriptionItem` | Individual prescribed medications |

**Key design choices:**
- Chain: `Patient → ClinicVisit → Consultation → Diagnosis/Treatment/Prescription`
- `ClinicVisit` links to `User` via `clinicianId`
- Clinical data is append-only; no soft delete on consultation children to preserve history
- `VitalSign` references `User` via `recordedById`

### 4. Appointments

| Model | Purpose |
|-------|---------|
| `Appointment` | Scheduled patient appointments |

**Key design choices:**
- Links to `Patient` and optionally to `User` (assigned clinician)
- Uses `AppointmentStatus`, `AppointmentPriority`, `AppointmentType` enums
- Composite index on `[patientId, scheduledAt]` for schedule lookups
- Soft delete via `cancellationReason` and status changes rather than row deletion

### 5. Health Records

| Model | Purpose |
|-------|---------|
| `HealthRequirement` | Requirement definition (e.g., annual clearance form) |
| `RequirementSubmission` | Patient submission tied to a requirement |
| `Clearance` | Clearance request/approval record |
| `VaccinationRecord` | Immunization record |
| `HealthScreening` | Screening results |
| `MedicalCertificate` | Issued medical certificates |
| `Document` | File metadata for uploaded documents |

**Key design choices:**
- `AcademicYear` and `Semester` drive requirement/clearance periods
- `RequirementSubmission.reviewerId` and `Clearance.issuedById` link to `User`
- `Document` is private by default (`isPrivate = true`)
- `MedicalCertificate` has a unique `documentId` for document linkage

### 6. Inventory

| Model | Purpose |
|-------|---------|
| `Medicine` | Medicine catalog |
| `MedicineBatch` | Batch-level stock with expiry tracking |
| `InventoryTransaction` | Stock movements (stock in, dispense, expired, etc.) |
| `MedicineDispensation` | Patient dispensation header |
| `MedicineDispensationItem` | Individual dispensed items |

**Key design choices:**
- Batch-level tracking via `MedicineBatch`
- `[medicineId, batchNumber]` is unique
- `InventoryTransactionType` enum controls transaction categories
- `InventoryTransaction.actorId` links to `User` for accountability
- Soft delete on `Medicine` preserves historical references

### 7. System Administration

| Model | Purpose |
|-------|---------|
| `AcademicYear` | Academic year definition |
| `Semester` | Semester within an academic year |
| `Notification` | User notifications |
| `Announcement` | System-wide announcements |
| `Archive` | Generic archive table for soft-deleted records across modules |
| `SystemSetting` | Key-value configuration store |

**Key design choices:**
- `Archive` uses `recordType` + `recordId` to point to any archived record
- `Notification` uses `NotificationType` and `NotificationStatus` enums
- `SystemSetting` provides runtime configuration without code deploys

## Enums

| Enum | Values |
|------|--------|
| `UserStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `Sex` | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| `PatientType` | STUDENT, FACULTY, STAFF |
| `VisitStatus` | OPEN, IN_CONSULTATION, COMPLETED, CANCELLED |
| `AppointmentStatus` | PENDING, APPROVED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED |
| `AppointmentPriority` | ROUTINE, URGENT, EMERGENCY |
| `AppointmentType` | CONSULTATION, FOLLOW_UP, VACCINATION, SCREENING, CLEARANCE, OTHER |
| `RequirementStatus` | NOT_SUBMITTED, SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED |
| `ClearanceStatus` | PENDING, INCOMPLETE, FOR_REVIEW, CLEARED, REJECTED, EXPIRED |
| `EmergencyType` | ILLNESS, INJURY, ALLERGIC_REACTION, ASTHMA, DIABETIC_EMERGENCY, OTHER |
| `Disposition` | DISCHARGED, ADMITTED, REFERRED, TRANSFERRED, OBSERVATION |
| `CertificateType` | MEDICAL_CLEARANCE, FITNESS_FOR_SCHOOL, FITNESS_FOR_WORK, VACCINATION_CERTIFICATE, MEDICAL_EXEMPTION, OTHER |
| `SemesterTerm` | FIRST, SECOND, SUMMER |
| `ArchiveStatus` | ACTIVE, ARCHIVED |
| `InventoryTransactionType` | STOCK_IN, ADJUSTMENT, DISPENSE, RETURNED, EXPIRED, DAMAGED, LOST |
| `NotificationType` | SYSTEM, APPOINTMENT, REQUIREMENT, CLEARANCE, ANNOUNCEMENT, OTHER |
| `NotificationStatus` | UNREAD, READ |
| `AuditAction` | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, DISPENSE, EXPORT, ARCHIVE, RESTORE |

## Indexing Strategy

Indexes are placed on:
- Foreign key columns (`patientId`, `userId`, `clinicVisitId`, etc.)
- Frequently filtered status columns
- Date columns used for range queries (`visitDate`, `scheduledAt`, `administeredAt`, `screenedAt`, `occurredAt`)
- Composite indexes for common query patterns (`[patientId, visitDate]`, `[patientId, scheduledAt]`, `[actorId, createdAt]`, `[entity, entityId]`)

## Soft Delete Strategy

Soft delete (`deletedAt`) is applied to:
- `User`
- `Patient`
- `Medicine`

Soft delete is **not** applied to:
- Transactional/historical records (`AuditLog`, `InventoryTransaction`, `MedicalHistory`, etc.)
- Junction tables (`UserRole`, `RolePermission`)
- Child records that should cascade with their parent

## Data Integrity Rules

1. Patient records cannot be hard-deleted; use `deletedAt` or `archiveStatus`
2. Audit logs are immutable; `actorId` uses `onDelete: SetNull`
3. Inventory transactions are append-only
4. Documents are private by default and referenced by `storageKey`, not public URLs
5. All clinical child records (`Diagnosis`, `Treatment`, `PrescriptionItem`, `VitalSign`) cascade delete with their parent consultation/visit
6. `RefreshToken` cascade deletes when a user is removed

## Running Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Requirements Alignment

### Covered Requirements

| Requirement | Implementation |
|-------------|----------------|
| User accounts with RBAC | `User`, `Role`, `Permission`, `UserRole`, `RolePermission` |
| JWT refresh tokens | `RefreshToken` with hash storage and revocation |
| Patient registration and profiles | `Patient`, `StudentProfile`, `EmployeeProfile`, `EmergencyContact` |
| Clinical visits and consultations | `ClinicVisit`, `VitalSign`, `Consultation`, `Diagnosis`, `Treatment`, `Prescription`, `PrescriptionItem` |
| Appointments | `Appointment` with status, priority, type, and clinician assignment |
| Health requirements and clearances | `HealthRequirement`, `RequirementSubmission`, `Clearance`, tied to `AcademicYear`/`Semester` |
| Vaccinations and screenings | `VaccinationRecord`, `HealthScreening` |
| Certificates and documents | `MedicalCertificate`, `Document` |
| Inventory management | `Medicine`, `MedicineBatch`, `InventoryTransaction`, `MedicineDispensation`, `MedicineDispensationItem` |
| Emergency cases | `EmergencyCase` with typed emergency type and disposition |
| Audit logging | `AuditLog` with typed `AuditAction` enum |
| Notifications and announcements | `Notification`, `Announcement` |
| Archive module | `Archive` generic archive table |
| System settings | `SystemSetting` key-value store |

### Tables Created

- Users/Auth: 7 tables (`User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`, `AuditLog`)
- Patients: 7 tables (`Patient`, `StudentProfile`, `EmployeeProfile`, `EmergencyContact`, `MedicalHistory`, `MedicalCondition`, `Allergy`)
- Clinical: 8 tables (`ClinicVisit`, `VitalSign`, `Consultation`, `Diagnosis`, `Treatment`, `Prescription`, `PrescriptionItem`, `EmergencyCase`)
- Appointments: 1 table (`Appointment`)
- Health Records: 7 tables (`AcademicYear`, `Semester`, `HealthRequirement`, `RequirementSubmission`, `Clearance`, `VaccinationRecord`, `HealthScreening`, `MedicalCertificate`, `Document`)
- Inventory: 5 tables (`Medicine`, `MedicineBatch`, `InventoryTransaction`, `MedicineDispensation`, `MedicineDispensationItem`)
- System: 4 tables (`Notification`, `Announcement`, `Archive`, `SystemSetting`)

### Relationships Created

- User ↔ Role: many-to-many via `UserRole`
- Role ↔ Permission: many-to-many via `RolePermission`
- User → RefreshToken: one-to-many
- User → AuditLog: one-to-many
- User → Appointment: one-to-many (assigned clinician)
- User → ClinicVisit: one-to-many (clinician)
- User → VitalSign: one-to-many (recorded by)
- User → Consultation: one-to-many (clinician)
- User → RequirementSubmission: one-to-many (reviewer)
- User → Clearance: one-to-many (issued by)
- User → VaccinationRecord: one-to-many (administered by)
- User → HealthScreening: one-to-many (screened by)
- User → MedicineDispensation: one-to-many (dispensed by)
- User → MedicalCertificate: one-to-many (issued by)
- User → Document: one-to-many (created by)
- User → Announcement: one-to-many (created by)
- User → InventoryTransaction: one-to-many (actor)
- User → EmergencyCase: one-to-many (attended by)
- Patient → StudentProfile: one-to-one
- Patient → EmployeeProfile: one-to-one
- Patient → EmergencyContact: one-to-many
- Patient → MedicalHistory: one-to-many
- Patient → MedicalCondition: one-to-many
- Patient → Allergy: one-to-many
- Patient → ClinicVisit: one-to-many
- Patient → Appointment: one-to-many
- Patient → RequirementSubmission: one-to-many
- Patient → Clearance: one-to-many
- Patient → VaccinationRecord: one-to-many
- Patient → HealthScreening: one-to-many
- Patient → MedicineDispensation: one-to-many
- Patient → MedicalCertificate: one-to-many
- Patient → Document: one-to-many
- AcademicYear → Semester: one-to-many
- AcademicYear → HealthRequirement: one-to-many
- AcademicYear → Clearance: one-to-many
- Semester → HealthRequirement: one-to-many
- Semester → Clearance: one-to-many
- ClinicVisit → VitalSign: one-to-many
- ClinicVisit → Consultation: one-to-many
- ClinicVisit → EmergencyCase: one-to-many
- Consultation → Diagnosis: one-to-many
- Consultation → Treatment: one-to-many
- Consultation → Prescription: one-to-many
- Prescription → PrescriptionItem: one-to-many
- Medicine → MedicineBatch: one-to-many
- MedicineBatch → InventoryTransaction: one-to-many
- MedicineBatch → MedicineDispensationItem: one-to-many
- MedicineDispensation → MedicineDispensationItem: one-to-many
- Document → RequirementSubmission: one-to-one
- Document → MedicalCertificate: one-to-one

### Assumptions Made

1. **Sex enum**: Used `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` per docs/database.md
2. **Archive module**: Implemented as a generic `Archive` table with `recordType` + `recordId` foreign key pattern, since no dedicated per-entity archive tables were specified
3. **Reports module**: No database models required; reports are computed from existing data
4. **Appointment status**: Added `RESCHEDULED` to align with NestJS module requirements
5. **Inventory transaction type**: Added `RETURNED` to support stock returns
6. **User status**: Added `UserStatus` enum to support account suspension
7. **Audit actions**: Typed `AuditAction` enum replaces generic String for better data integrity
8. **Document linkage**: `Document` can be linked to `RequirementSubmission` or `MedicalCertificate` via separate nullable foreign keys

### Open Questions for Kyle (PM)

1. **Archive retention policy**: Should archived records be permanently deleted after a certain period, or retained indefinitely?
2. **Patient identifier format**: Is `patientNumber` auto-generated or manually assigned? The current schema allows manual entry.
3. **Notification cleanup**: Should old notifications be automatically purged? If so, what retention period?
4. **Multi-tenancy**: Does BCHealth need multi-tenant support (multiple clinics/schools), or is this a single-tenant deployment?
5. **Document storage**: Should `storageKey` reference a specific cloud provider (e.g., Azure Blob Storage), or is the abstraction acceptable?
6. **Appointment conflicts**: Should the database enforce unique constraints to prevent double-booking, or is this handled at the application level?
