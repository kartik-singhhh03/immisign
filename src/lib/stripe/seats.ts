import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BASE_PRICE_MONTHLY_USD,
  INCLUDED_SEATS,
  SEAT_PRICE_MONTHLY_USD,
} from './plan';

/** Owner is never billed as a seat. */
export function isBillableRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role.toLowerCase() !== 'owner';
}

export function additionalSeatsFromBillableCount(billableCount: number): number {
  return Math.max(0, billableCount - INCLUDED_SEATS);
}

export function calculateMonthlyPriceUsd(billableCount: number): number {
  const additional = additionalSeatsFromBillableCount(billableCount);
  return BASE_PRICE_MONTHLY_USD + additional * SEAT_PRICE_MONTHLY_USD;
}

export async function countActiveBillableUsers(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .neq('role', 'owner');

  if (error) throw error;
  return count ?? 0;
}

export async function countPendingBillableInvites(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('invitations')
    .select('role')
    .eq('agency_id', agencyId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;

  return (data ?? []).filter((row) => isBillableRole(row.role)).length;
}

export async function getAgencySeatSnapshot(
  supabase: SupabaseClient,
  agencyId: string,
  options?: { includePendingInviteRole?: string },
): Promise<{
  includedSeats: number;
  usedSeats: number;
  pendingBillableInvites: number;
  projectedBillableSeats: number;
  additionalSeats: number;
  monthlyTotalUsd: number;
  nextSeatIncreaseUsd: number;
  wouldIncreaseSubscription: boolean;
}> {
  const usedSeats = await countActiveBillableUsers(supabase, agencyId);
  const pendingBillableInvites = await countPendingBillableInvites(supabase, agencyId);

  const extraFromInvite =
    options?.includePendingInviteRole && isBillableRole(options.includePendingInviteRole)
      ? 1
      : 0;

  const projectedBillableSeats = usedSeats + pendingBillableInvites + extraFromInvite;
  const additionalSeats = additionalSeatsFromBillableCount(projectedBillableSeats);
  const currentAdditional = additionalSeatsFromBillableCount(
    usedSeats + pendingBillableInvites,
  );

  return {
    includedSeats: INCLUDED_SEATS,
    usedSeats,
    pendingBillableInvites,
    projectedBillableSeats,
    additionalSeats,
    monthlyTotalUsd: calculateMonthlyPriceUsd(projectedBillableSeats),
    nextSeatIncreaseUsd: SEAT_PRICE_MONTHLY_USD,
    wouldIncreaseSubscription:
      extraFromInvite > 0 && additionalSeats > currentAdditional,
  };
}
