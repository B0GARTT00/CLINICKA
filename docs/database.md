# Database

The database is designed for MySQL through Prisma. The schema covers all BCHealth domain areas: Users/Auth, Patients, Clinical, Appointments, Health Records, Inventory, and System.

## Domain Areas

### Users/Auth
- `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`
- RBAC with many-to-many user-role and role-permission relationships
- Refresh tokens stored as hashes with expiration and revocation support

### Patients
- `Patient`, `StudentProfile`, `EmployeeProfile`, `EmergencyContact`
- Patients are not assumed to be students; may have student or employee profile
- Sex stored as enum (`MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`)

### Clinical
- `ClinicVisit`, `VitalSign`, `Consultation`, `Diagnosis`, `Treatment`, `Prescription`, `PrescriptionItem`
- `MedicalHistory`, `MedicalCondition`, `Allergy`
- `EmergencyCase` with typed emergency/disposition enums
- Clinical records are historical and should not be overwritten

### Appointments
- `Appointment` with status tracking and clinician assignment

### Health Records
- `HealthRequirement`, `RequirementSubmission`, `Clearance`
- `VaccinationRecord`, `HealthScreening`
- `MedicalCertificate`, `Document`
- Tied to academic year/semester structure

### Inventory
- `Medicine`, `MedicineBatch`, `InventoryTransaction`
- `MedicineDispensation`, `MedicineDispensationItem`
- Batch-level tracking with expiry management

### System
- `AcademicYear`, `Semester`
- `Notification`, `Announcement`
- `AuditLog`

## Design Principles

- **Timestamps**: All models include `createdAt` and `updatedAt`. Most use `@default(now())` and `@updatedAt`.
- **Soft Delete**: `deletedAt DateTime?` on all primary entities (User, Patient, ClinicVisit, Consultation, Appointment, Clearance, etc.)
- **Relations**: All foreign key IDs have corresponding Prisma relation fields with proper `onDelete` behavior (`Cascade` for owned children, `SetNull` for optional references).
- **Enums**: Status fields use typed enums (`VisitStatus`, `AppointmentStatus`, `RequirementStatus`, `ClearanceStatus`, `EmergencyType`, `Disposition`, `CertificateType`, `NotificationType`, `Sex`, `ArchiveStatus`, `InventoryTransactionType`, `SemesterTerm`, `PatientType`).
- **Indexes**: Targeted composite and single-column indexes for common query patterns (patient lookups, date ranges, status filters, foreign keys).
- **Documents**: Private by default, referenced by storage keys, not public URLs.

## Running Migrations

```bash
npm run prisma:migrate
```

## Generating Client

```bash
npm run prisma:generate
```
