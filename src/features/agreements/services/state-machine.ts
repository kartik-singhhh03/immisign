import { AgreementStatus } from '../types';

/**
 * Valid state transitions for an Agreement.
 */
const ALLOWED_TRANSITIONS: Record<AgreementStatus, AgreementStatus[]> = {
  [AgreementStatus.DRAFT]: [AgreementStatus.GENERATED, AgreementStatus.CANCELLED],
  [AgreementStatus.GENERATED]: [AgreementStatus.SENT, AgreementStatus.CANCELLED],
  [AgreementStatus.SENT]: [AgreementStatus.VIEWED, AgreementStatus.SIGNED, AgreementStatus.DECLINED, AgreementStatus.EXPIRED, AgreementStatus.CANCELLED],
  [AgreementStatus.VIEWED]: [AgreementStatus.SIGNED, AgreementStatus.DECLINED, AgreementStatus.EXPIRED, AgreementStatus.CANCELLED],
  [AgreementStatus.SIGNED]: [AgreementStatus.COMPLETED], // Can be completed after signing
  [AgreementStatus.COMPLETED]: [], // Terminal
  [AgreementStatus.DECLINED]: [AgreementStatus.DRAFT, AgreementStatus.CANCELLED], // Can revert to draft to fix
  [AgreementStatus.REJECTED]: [AgreementStatus.DRAFT, AgreementStatus.CANCELLED], // Synonymous with declined mostly
  [AgreementStatus.EXPIRED]: [AgreementStatus.DRAFT, AgreementStatus.CANCELLED],
  [AgreementStatus.CANCELLED]: [] // Terminal
};

export class AgreementStateMachine {
  /**
   * Checks if a transition is valid.
   */
  static canTransition(currentStatus: AgreementStatus, newStatus: AgreementStatus): boolean {
    if (currentStatus === newStatus) return true; // No-op is valid
    const validNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
    return validNextStates.includes(newStatus);
  }

  /**
   * Validates a transition and throws if invalid.
   */
  static validateTransition(currentStatus: AgreementStatus, newStatus: AgreementStatus): void {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid agreement state transition: Cannot transition from ${currentStatus} to ${newStatus}.`);
    }
  }

  /**
   * Transition helper for services.
   */
  static transition(currentStatus: AgreementStatus, newStatus: AgreementStatus): AgreementStatus {
    this.validateTransition(currentStatus, newStatus);
    return newStatus;
  }
}
