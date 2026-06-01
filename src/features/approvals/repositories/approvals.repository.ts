import { SupabaseClient } from '@supabase/supabase-js';
import { ApplicationApproval, ApprovalStatus } from '../types';

export class ApprovalRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: Partial<ApplicationApproval>): Promise<ApplicationApproval> {
    const { data: approval, error } = await this.supabase
      .from('application_approvals')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return approval as ApplicationApproval;
  }

  async getById(id: string): Promise<ApplicationApproval | null> {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as ApplicationApproval;
  }

  async getByToken(token: string): Promise<ApplicationApproval | null> {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .select('*')
      .eq('review_token', token)
      .single();

    if (error || !data) return null;
    return data as ApplicationApproval;
  }

  async update(id: string, updates: Partial<ApplicationApproval>): Promise<ApplicationApproval> {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ApplicationApproval;
  }

  async listForAgency(agencyId: string): Promise<ApplicationApproval[]> {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ApplicationApproval[];
  }
}
