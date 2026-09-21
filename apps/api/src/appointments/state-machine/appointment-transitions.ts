import { AppointmentStatus } from '@prisma/client';

/**
 * Canonical appointment status transition table.
 *
 * This is the single source of truth for every permitted state transition in
 * the appointment lifecycle. It is kept dependency-free so it can be imported
 * by both the state machine and the validation exceptions without creating
 * circular imports.
 *
 * Terminal states (COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED) have an empty
 * transition list, meaning no further status changes are permitted once an
 * appointment reaches them.
 *
 * CHECKED_IN is a transitional state that must progress to COMPLETED or NO_SHOW.
 */
export const APPOINTMENT_STATE_TRANSITIONS: Readonly<Record<AppointmentStatus, readonly AppointmentStatus[]>> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.APPROVED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.APPROVED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.CHECKED_IN]: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
  [AppointmentStatus.RESCHEDULED]: [],
};

/** The set of statuses from which an appointment may be checked in. */
export const CHECKIN_SOURCES: readonly AppointmentStatus[] = [
  AppointmentStatus.APPROVED,
  AppointmentStatus.CONFIRMED,
];

/** The set of statuses considered "active" (occupy capacity). */
export const ACTIVE_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.APPROVED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
];

/** The set of terminal statuses (no outgoing transitions). */
export const TERMINAL_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.RESCHEDULED,
];

/**
 * Returns the list of statuses an appointment may transition to from the given state.
 * Returns an empty array for terminal states.
 */
export function getPermittedTargets(current: AppointmentStatus): readonly AppointmentStatus[] {
  return APPOINTMENT_STATE_TRANSITIONS[current] ?? [];
}

/**
 * Returns true when a transition from `current` to `next` is permitted.
 * A transition to the same status is treated as a no-op and is allowed so
 * idempotent calls do not surface an error.
 */
export function isPermittedTransition(current: AppointmentStatus, next: AppointmentStatus): boolean {
  if (current === next) {
    return true;
  }
  return getPermittedTargets(current).includes(next);
}

/**
 * Returns true when an appointment in the given status may be checked in.
 */
export function canCheckInFrom(current: AppointmentStatus): boolean {
  return CHECKIN_SOURCES.includes(current);
}

/**
 * Returns true when an appointment in the given status is considered active
 * (occupies a time slot / capacity).
 */
export function isActiveStatus(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Returns true when an appointment in the given status is terminal.
 */
export function isTerminalStatus(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Returns the human-readable list of permitted target statuses for a state,
 * used to build descriptive error messages.
 */
export function formatPermittedTargets(current: AppointmentStatus): string {
  const targets = getPermittedTargets(current);
  return targets.length === 0 ? 'none (terminal state)' : targets.map(s => `'${s}'`).join(', ');
}