# Deterministic Eligibility Engine - Technical Specification

## Overview

This document specifies the design and implementation of a deterministic eligibility engine for the BCHealth clearance system. The engine replaces the current "present/absent" eligibility model with strict rule validation that produces granular, actionable feedback.

---

## 1. Current State Analysis

### Existing `eligibility()` Method (ClearancesService)
The current method only checks if submissions exist and are VERIFIED. It does NOT:
- Check expiration dates
- Validate against Academic Year/Semester
- Produce granular ineligibility reasons
- Enforce integrity constraints on clearance issuance

---

## 2. Core Logic Requirements

### 2.1 Requirement Applicability
A requirement applies to a patient iff:
- `archiveStatus === 'ACTIVE'`
- `applicableTo === patient.type` OR `applicableTo === 'ALL'`
- `academicYearId` matches the active Academic Year (or is null for year-agnostic)
- `semesterId` matches the target Semester (or is null for semester-agnostic)

### 2.2 Status Validation
A requirement is satisfied iff:
- At least one `RequirementSubmission` exists for this patient + requirement
- The submission's `status === VERIFIED`
- The submission's `expiresAt` is null OR `expiresAt > now()`

### 2.3 Temporal Validation
- Requirements with `academicYearId` must match the clearance's Academic Year
- Requirements with `semesterId` must match the clearance's Semester
- Requirements without these fields apply to all periods

---

## 3. Eligibility Evaluation Algorithm

```
function evaluateEligibility(patient, academicYear, semester):
  applicableRequirements = filterRequirements(patient, academicYear, semester)
  
  for each requirement in applicableRequirements:
    submission = findSubmission(patient, requirement)
    
    if no submission:
      addIneligibilityReason(requirement, "NOT_SUBMITTED")
    elif submission.status != VERIFIED:
      addIneligibilityReason(requirement, "NOT_VERIFIED", submission.status)
    elif submission.expiresAt and submission.expiresAt <= now():
      addIneligibilityReason(requirement, "EXPIRED", submission.expiresAt)
  
  return {
    eligible: ineligibilityReasons.length === 0,
    ineligibilityReasons: [...],
    applicableRequirements: [...],
    evaluatedAt: now(),
    academicYear: academicYear,
    semester: semester
  }
```

---

## 4. Implementation Plan

### Phase 1: Prisma Schema Updates
1. Add `eligibilityContext` JSON field to `Clearance` model
2. Add `ineligibilityReasons` JSON field to `Clearance` model
3. Run migration

### Phase 2: Eligibility Engine
Create `src/clearances/eligibility/`:
- `eligibility-engine.ts` - deterministic evaluation logic
- `eligibility-rule.ts` - individual rule validators
- `eligibility-engine.exceptions.ts` - descriptive exceptions

### Phase 3: Service Refactor
Update `ClearancesService`:
- Replace `eligibility()` with engine-based evaluation
- Add integrity constraint in `review()` - reject if ineligible
- Capture context on issuance

### Phase 4: Tests
- Rule validation tests
- Temporal alignment tests
- Expiration date tests
- Integrity constraint tests

---

## 5. API Contracts

### Evaluate Eligibility
GET /api/clearances/eligibility/:patientId?academicYearId=X&semesterId=Y
Response: 200 + {
  eligible: boolean,
  ineligibilityReasons: [{ requirementId, requirementName, reason, detail }],
  applicableRequirements: [...],
  evaluatedAt: ISO date,
  academicYear: { id, name },
  semester: { id, name } | null
}

### Create Clearance
POST /api/clearances
Body: { patientId, type, academicYearId, semesterId? }
Response: 201 + clearance with eligibilityContext and ineligibilityReasons captured

---

## 6. Acceptance Criteria Verification

| Requirement | Implementation |
|-------------|----------------|
| Prevent clearance issuance if rules violated | `review()` checks eligibilityContext before issuing |
| Granular ineligibility reasons | `IneligibilityReason[]` array with requirement, reason, detail |
| UI displays unmet requirements | API returns structured reasons for each requirement |
| Context preserved on issuance | `eligibilityContext` JSON captured at creation time |

---

## 7. Ineligibility Reason Codes

| Code | Meaning | Example |
|------|---------|---------|
| NOT_SUBMITTED | No evidence submission exists | "Requirement 'Vaccination record' has not been submitted" |
| NOT_VERIFIED | Submission exists but not verified | "Requirement 'TB Test' is pending review" |
| EXPIRED | Verified submission expired | "Requirement 'TB Test' expired on 2026-03-15" |
| WRONG_PERIOD | Requirement doesn't match academic year | "Requirement 'Academic Record' is for 2025-2026, not 2026-2027" |

---

*Document Version: 1.0*
*Author: BCHealth Engineering*
*Date: 2026-09-19*
