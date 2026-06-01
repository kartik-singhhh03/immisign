"use server"

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ApprovalService } from '../services/approval.service';
import { ApplicationApproval } from '../types';
import { Role } from '@/features/auth/types/roles';

async function getApprovalService() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  );
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
