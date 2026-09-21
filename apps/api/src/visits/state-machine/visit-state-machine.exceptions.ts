import { UnprocessableEntityException } from '@nestjs/common';
import { VisitStatus } from '@prisma/client';
import {
  formatPermittedTargets,
  getPermittedTargets,
} from './visit-transitions';

export class InvalidVisitTransitionException extends UnprocessableEntityException {
  constructor(current: VisitStatus, attempted: VisitStatus) {
    super(
      `Invalid visit status transition: cannot move visit from '${current}' to '${attempted}'. ` +
      `Permitted transitions from '${current}' are: ${formatPermittedTargets(current)}.`,
    );
  }
}

export class VisitAlreadyCompletedException extends UnprocessableEntityException {
  constructor() {
    super('Visit is already in the COMPLETED state and cannot be transitioned further.');
  }
}

export class VisitAlreadyCancelledException extends UnprocessableEntityException {
  constructor() {
    super('Visit is already in the CANCELLED state and cannot be transitioned further.');
  }
}

export class VisitCannotCompleteFromCurrentStatusException extends UnprocessableEntityException {
  constructor(current: VisitStatus) {
    super(
      `Cannot complete visit: current status is '${current}'. ` +
      `A visit may only be completed from the 'IN_CONSULTATION' status.`,
    );
  }
}

export class VisitIncompleteForCompletionException extends UnprocessableEntityException {
  constructor(missing: string[]) {
    super(
      `Cannot complete visit: the longitudinal record is incomplete. ` +
      `Missing required clinical actions: ${missing.join(', ')}. ` +
      `Vital signs and a consultation note must be documented before a visit can be marked COMPLETED.`,
    );
  }
}

/** Re-export for consumers that need the transition table via the exceptions module. */
export { getPermittedTargets };