import { VisitStatus } from '@prisma/client';

/**
 * Canonical visit status transition table.
 *
 * This is the single source of truth for every permitted state transition in
 * the clinic-visit lifecycle. It is kept dependency-free so it can be imported
 * by both the state machine and the validation exceptions without creating
 * circular imports.
 *
 * Terminal states (COMPLETED, CANCELLED) have an empty transition list, meaning
 * no further status changes are permitted once a visit reaches them.
 */
export const VISIT_STATE_TRANSITIONS: Readonly<Record<VisitStatus, readonly VisitStatus[]>> = {
  [VisitStatus.OPEN]: [VisitStatus.IN_CONSULTATION, VisitStatus.CANCELLED],
  [VisitStatus.IN_CONSULTATION]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: [],
};

/** The set of statuses from which a visit may be completed. */
export const COMPLETABLE_SOURCES: readonly VisitStatus[] = [VisitStatus.IN_CONSULTATION];

/** The set of statuses from which a visit may be cancelled. */
export const CANCELLABLE_SOURCES: readonly VisitStatus[] = [VisitStatus.OPEN, VisitStatus.IN_CONSULTATION];

/**
 * Returns the list of statuses a visit may transition to from the given state.
 * Returns an empty array for terminal states.
 */
export function getPermittedTargets(current: VisitStatus): readonly VisitStatus[] {
  return VISIT_STATE_TRANSITIONS[current] ?? [];
}

/**
 * Returns true when a transition from `current` to `next` is permitted.
 * A transition to the same status is treated as a no-op and is allowed so
 * idempotent calls do not surface an error.
 */
export function isPermittedTransition(current: VisitStatus, next: VisitStatus): boolean {
  if (current === next) {
    return true;
  }
  return getPermittedTargets(current).includes(next);
}

/**
 * Returns true when a visit in the given status may be completed.
 */
export function canCompleteFrom(current: VisitStatus): boolean {
  return COMPLETABLE_SOURCES.includes(current);
}

/**
 * Returns true when a visit in the given status may be cancelled.
 */
export function canCancelFrom(current: VisitStatus): boolean {
  return CANCELLABLE_SOURCES.includes(current);
}

/**
 * Returns the human-readable list of permitted target statuses for a state,
 * used to build descriptive error messages.
 */
export function formatPermittedTargets(current: VisitStatus): string {
  const targets = getPermittedTargets(current);
  return targets.length === 0 ? 'none (terminal state)' : targets.map(s => `'${s}'`).join(', ');
}