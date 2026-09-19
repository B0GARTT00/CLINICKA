import { VisitStatus } from '@prisma/client';
import {
  InvalidVisitTransitionException,
  VisitAlreadyCompletedException,
  VisitAlreadyCancelledException,
  VisitCannotCompleteFromCurrentStatusException,
  VisitIncompleteForCompletionException,
} from './visit-state-machine.exceptions';

describe('visit-state-machine.exceptions', () => {
  describe('InvalidVisitTransitionException', () => {
    it('creates descriptive message for OPEN -> COMPLETED', () => {
      const error = new InvalidVisitTransitionException(VisitStatus.OPEN, VisitStatus.COMPLETED);
      expect(error.message).toContain("cannot move visit from 'OPEN' to 'COMPLETED'");
      expect(error.message).toContain("'IN_CONSULTATION', 'CANCELLED'");
    });

    it('creates descriptive message for IN_CONSULTATION -> OPEN', () => {
      const error = new InvalidVisitTransitionException(VisitStatus.IN_CONSULTATION, VisitStatus.OPEN);
      expect(error.message).toContain("cannot move visit from 'IN_CONSULTATION' to 'OPEN'");
      expect(error.message).toContain("'COMPLETED', 'CANCELLED'");
    });

    it('creates terminal state message for COMPLETED -> OPEN', () => {
      const error = new InvalidVisitTransitionException(VisitStatus.COMPLETED, VisitStatus.OPEN);
      expect(error.message).toContain("terminal state");
    });
  });

  describe('VisitAlreadyCompletedException', () => {
    it('has correct message', () => {
      const error = new VisitAlreadyCompletedException();
      expect(error.message).toBe('Visit is already in the COMPLETED state and cannot be transitioned further.');
    });
  });

  describe('VisitAlreadyCancelledException', () => {
    it('has correct message', () => {
      const error = new VisitAlreadyCancelledException();
      expect(error.message).toBe('Visit is already in the CANCELLED state and cannot be transitioned further.');
    });
  });

  describe('VisitCannotCompleteFromCurrentStatusException', () => {
    it('creates descriptive message for OPEN', () => {
      const error = new VisitCannotCompleteFromCurrentStatusException(VisitStatus.OPEN);
      expect(error.message).toContain("current status is 'OPEN'");
      expect(error.message).toContain("'IN_CONSULTATION'");
    });

    it('creates descriptive message for CANCELLED', () => {
      const error = new VisitCannotCompleteFromCurrentStatusException(VisitStatus.CANCELLED);
      expect(error.message).toContain("current status is 'CANCELLED'");
    });
  });

  describe('VisitIncompleteForCompletionException', () => {
    it('lists single missing prerequisite', () => {
      const error = new VisitIncompleteForCompletionException(['vital signs']);
      expect(error.message).toContain('Missing required clinical actions: vital signs');
    });

    it('lists multiple missing prerequisites', () => {
      const error = new VisitIncompleteForCompletionException(['vital signs', 'consultation note']);
      expect(error.message).toContain('Missing required clinical actions: vital signs, consultation note');
    });

    it('includes guidance text', () => {
      const error = new VisitIncompleteForCompletionException(['vital signs']);
      expect(error.message).toContain('must be documented before a visit can be marked COMPLETED');
    });
  });
});