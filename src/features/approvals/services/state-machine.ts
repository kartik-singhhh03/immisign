import { ApprovalAction, ApprovalStatus } from '../types';

const ALLOWED_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  [ApprovalStatus.DRAFT]: [ApprovalStatus.SUBMITTED],
  [ApprovalStatus.SUBMITTED]: [ApprovalStatus.UNDER_REVIEW],
  [ApprovalStatus.UNDER_REVIEW]: [
    ApprovalStatus.CHANGES_REQUESTED,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED,
  ],
  [ApprovalStatus.CHANGES_REQUESTED]: [ApprovalStatus.SUBMITTED],
  [ApprovalStatus.APPROVED]: [ApprovalStatus.READY_TO_LODGE],
  [ApprovalStatus.READY_TO_LODGE]: [ApprovalStatus.LODGED],
  [ApprovalStatus.LODGED]: [ApprovalStatus.CLOSED],
  [ApprovalStatus.REJECTED]: [],
  [ApprovalStatus.CLOSED]: [],
};

const ACTION_TO_STATUS: Record<ApprovalAction, ApprovalStatus | null> = {
  submit: ApprovalStatus.SUBMITTED,
  start_review: ApprovalStatus.UNDER_REVIEW,
  request_changes: ApprovalStatus.CHANGES_REQUESTED,
  approve: ApprovalStatus.APPROVED,
  reject: ApprovalStatus.REJECTED,
  resubmit: ApprovalStatus.SUBMITTED,
  ready_to_lodge: ApprovalStatus.READY_TO_LODGE,
  lodged: ApprovalStatus.LODGED,
  close: ApprovalStatus.CLOSED,
  assign_reviewer: null,
  assign_rma: null,
};

export class ApprovalStateMachine {
  static canTransition(current: ApprovalStatus, next: ApprovalStatus): boolean {
    if (current === next) return true;
    return (ALLOWED_TRANSITIONS[current] || []).includes(next);
  }

  static validateTransition(current: ApprovalStatus, next: ApprovalStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid approval transition: ${current} → ${next}`);
    }
  }

  static statusForAction(action: ApprovalAction): ApprovalStatus | null {
    return ACTION_TO_STATUS[action];
  }

  static applyAction(current: ApprovalStatus, action: ApprovalAction): ApprovalStatus {
    const next = ACTION_TO_STATUS[action];
    if (!next) return current;
    this.validateTransition(current, next);
    return next;
  }
}
