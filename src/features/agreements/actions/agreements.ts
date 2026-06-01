"use server"

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AgreementService } from '../services/agreements.service';
import { SignWellService } from '../services/signwell.service';
import { Agreement } from '../types';
import { Role } from '@/features/auth/types/roles';

// Internal helper to get initialized service
async function getAgreementService() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
      },
    },
  });

  return new AgreementService(supabase);
}

// In a real app, these values would come from the verified session context or JWT claims
// For now we pass them explicitly from the client components for demonstration.
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

  const signwellService = new SignWellService(supabase);
  return await signwellService.sendForSignature(agencyId, userId, role, agreementId);
}
