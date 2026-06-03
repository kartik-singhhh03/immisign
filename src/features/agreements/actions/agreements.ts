"use server"

import { createClient } from '@/lib/supabase/server';
import { AgreementService } from '../services/agreements.service';
import { SignWellService } from '../services/signwell.service';
import { Agreement } from '../types';
import { Role } from '@/features/auth/types/roles';

async function getAgreementService() {
  const supabase = await createClient();
  return new AgreementService(supabase);
}

export async function createAgreementAction(agencyId: string, userId: string, role: Role, data: Partial<Agreement>) {
  const service = await getAgreementService();
  return service.createAgreement(agencyId, userId, role, data);
}

export async function updateAgreementAction(agencyId: string, userId: string, role: Role, agreementId: string, data: Partial<Agreement>) {
  const service = await getAgreementService();
  return service.updateAgreement(agencyId, userId, role, agreementId, data);
}

export async function archiveAgreementAction(agencyId: string, userId: string, role: Role, agreementId: string) {
  const service = await getAgreementService();
  return service.archiveAgreement(agencyId, userId, role, agreementId);
}

export async function sendAgreementForSignatureAction(agencyId: string, userId: string, role: Role, agreementId: string) {
  const supabase = await createClient();
  const signwellService = new SignWellService(supabase);
  return await signwellService.sendForSignature(agencyId, userId, role, agreementId);
}
