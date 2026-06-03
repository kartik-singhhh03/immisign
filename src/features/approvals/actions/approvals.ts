"use server"

import { createClient } from '@/lib/supabase/server';
import { ApprovalService } from '../services/approval.service';
import { ApplicationApproval } from '../types';
import { Role } from '@/features/auth/types/roles';

async function getApprovalService() {
  const supabase = await createClient();
  return new ApprovalService(supabase);
}

export async function createApprovalAction(agencyId: string, userId: string, role: Role, data: Partial<ApplicationApproval>) {
  const service = await getApprovalService();
  return await service.createApproval(agencyId, userId, role, data);
}

export async function sendApprovalForReviewAction(agencyId: string, userId: string, role: Role, approvalId: string) {
  const service = await getApprovalService();
  return await service.sendForReview(agencyId, userId, role, approvalId);
}

export async function clientMarkViewedAction(token: string) {
  const service = await getApprovalService();
  return await service.markViewedByClient(token);
}

export async function clientApproveAction(token: string) {
  const service = await getApprovalService();
  return await service.approveByClient(token);
}

export async function clientRequestChangesAction(token: string, comment: string) {
  const service = await getApprovalService();
  return await service.requestChangesByClient(token, comment);
}
