import { ApprovalStatus } from '../types';

const ALLOWED_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  [ApprovalStatus.DRAFT]: [ApprovalStatus.PENDING_REVIEW, ApprovalStatus.ARCHIVED],
  [ApprovalStatus.PENDING_REVIEW]: [ApprovalStatus.VIEWED, ApprovalStatus.APPROVED, ApprovalStatus.CHANGES_REQUESTED, ApprovalStatus.ARCHIVED],
  [ApprovalStatus.VIEWED]: [ApprovalStatus.APPROVED, ApprovalStatus.CHANGES_REQUESTED, ApprovalStatus.ARCHIVED],
  [ApprovalStatus.CHANGES_REQUESTED]: [ApprovalStatus.DRAFT, ApprovalStatus.PENDING_REVIEW, ApprovalStatus.ARCHIVED], // back to draft/pending for new version upload
  [ApprovalStatus.APPROVED]: [ApprovalStatus.ARCHIVED], // Terminal success
  [ApprovalStatus.ARCHIVED]: [], // Terminal state
};

export class ApprovalStateMachine {
  static canTransition(currentStatus: ApprovalStatus, newStatus: ApprovalStatus): boolean {
    if (currentStatus === newStatus) return true;
    const validNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
    return validNextStates.includes(newStatus);
  }

  static validateTransition(currentStatus: ApprovalStatus, newStatus: ApprovalStatus): void {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid approval state transition: Cannot transition from ${currentStatus} to ${newStatus}.`);
    }
  }

  static transition(currentStatus: ApprovalStatus, newStatus: ApprovalStatus): ApprovalStatus {
    this.validateTransition(currentStatus, newStatus);
    return newStatus;
  }
}
