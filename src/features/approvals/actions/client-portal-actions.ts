"use server"

import { createAdminClient } from '@/lib/supabase/admin';
import { ApprovalService } from '../services/approval.service';

export async function clientApproveAction(token: string) {
  const admin = createAdminClient();
  const service = new ApprovalService(admin);
  return service.clientApproveByToken(token);
}

export async function clientRequestChangesAction(token: string, content: string) {
  const admin = createAdminClient();
  const service = new ApprovalService(admin);
  return service.clientRequestChangesByToken(token, content);
}
