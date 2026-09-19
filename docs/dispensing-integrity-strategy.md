# Medicine Dispensing Integrity Strategy

## Overview

This document identifies vulnerabilities in the current medicine dispensing workflow and proposes technical and procedural controls to strengthen the integrity of the link between dispensing records and patient clinical visits.

---

## 1. Current Workflow Analysis

### Existing Flow
```
Consultation (prescription) → Dispensation (dispense) → Inventory (stock update)
```

### Current Model
```prisma
model MedicineDispensation {
  id            String                     @id @default(uuid())
  patientId     String
  clinicVisitId String?                    // OPTIONAL — dispensing allowed without visit
  dispensedById String?
  items         MedicineDispensationItem[]
  notes         String?
  createdAt     DateTime                   @default(now())
}

model MedicineDispensationItem {
  id              String               @id @default(uuid())
  dispensationId  String
  medicineBatchId String
  quantity        Int
  instructions    String?
}
```

---

## 2. Identified Vulnerabilities

### V1: Optional Visit Linkage
**Risk**: Medication can be dispensed without any clinical visit context.
**Impact**: Untraceable dispensing, potential diversion, inability to audit clinical rationale.

### V2: No Prescription Validation
**Risk**: Dispensation items are not validated against the visit's consultation prescriptions.
**Impact**: Wrong medications, wrong dosages, drug interactions undetected.

### V3: No Reconciliation Mechanism
**Risk**: No system to compare prescribed vs. dispensed quantities.
**Impact**: Over-dispensing, stock leakage, patient harm.

### V4: No Dispensing Limits
**Risk**: No per-visit or per-patient dispensing caps.
**Impact**: Excessive dispensing, stock exhaustion.

### V5: Weak Audit Trail
**Risk**: Dispensation audit log doesn't link to visit or consultation.
**Impact**: Inability to trace medication flow end-to-end.

---

## 3. Proposed Controls

### 3.1 Technical Controls

#### T1: Enforce Visit Linkage
- Make `clinicVisitId` required when a prescription exists
- Add `prescriptionId` FK to link dispensation to specific prescription

#### T2: Prescription-Dispensation Reconciliation
- Validate each dispensation item against the visit's prescription items
- Enforce quantity limits (dispensed <= prescribed)

#### T3: Dispensing Caps
- Per-visit cap: max items per dispensation
- Per-patient cap: max quantity per medicine per visit

#### T4: Real-time Inventory Validation
- Already implemented (stock check on dispense)
- Add: batch expiration validation (already implemented)

### 3.2 Procedural Controls

#### P1: Dual-Verification Workflow
- Pharmacist verifies prescription before dispensing
- Second nurse verifies dispensed items against prescription

#### P2: Reconciliation Report
- Daily report: prescribed vs. dispensed per visit
- Flag: visits with prescriptions but no dispensation

#### P3: Exception Handling
- Document reasons for dispensing without prescription
- Require supervisor approval for exceptions

---

## 4. Implementation Plan

### Phase 1: Schema Updates
1. Add `prescriptionId` FK to `MedicineDispensation`
2. Add `dispensedById` required constraint
3. Add `reconciledAt` timestamp

### Phase 2: Validation Engine
Create `src/dispensing/eligibility/`:
- `dispensing-validator.ts` — prescription reconciliation
- `dispensing-limits.ts` — per-visit/patient caps

### Phase 3: Service Refactor
Update `DispensingService`:
- Validate prescription linkage
- Enforce quantity limits
- Record reconciliation

### Phase 4: Monitoring
Create `src/dispensing/monitoring/`:
- `discrepancy-reporter.ts` — generates reconciliation reports
- `alert-service.ts` — flags discrepancies

---

## 5. Monitoring Framework

### Metrics Tracked
| Metric | Threshold | Action |
|--------|-----------|--------|
| Unprescribed dispensations | > 0 | Alert supervisor |
| Over-dispensed quantity | > 0 | Block transaction |
| Visit without dispensation (when prescribed) | > 0 | Flag for review |
| Stock discrepancy | > 5% | Investigate |

### Report Types
1. **Daily Reconciliation**: Prescribed vs. dispensed per visit
2. **Exception Report**: Dispensations without prescriptions
3. **Stock Audit**: Physical count vs. system count
4. **Patient History**: All medications dispensed per patient

---

## 6. Acceptance Criteria

| Requirement | Implementation |
|-------------|----------------|
| Dispensing must link to a valid visit | `clinicVisitId` required when prescription exists |
| Dispensed items must match prescription | `validateAgainstPrescription()` in `create()` |
| Quantity limits enforced | Per-visit and per-patient caps |
| Reconciliation reports generated | `DiscrepancyReporter` service |
| Audit trail links to visit and prescription | Enhanced audit logging |

---

*Document Version: 1.0*
*Author: BCHealth Engineering*
*Date: 2026-09-19*