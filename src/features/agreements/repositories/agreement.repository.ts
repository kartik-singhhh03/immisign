import { SupabaseClient } from '@supabase/supabase-js';
import { Agreement, AgreementSchema } from '../types';
import { assertUuid } from '@/lib/validation/uuid';

export class AgreementRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(agreement: Partial<Agreement>): Promise<Agreement> {
    assertUuid(agreement.agency_id, 'agency_id');
    assertUuid(agreement.created_by, 'created_by');

    const { data, error } = await this.supabase
      .from('agreements')
      .insert(agreement)
      .select()
      .single();

    if (error) throw new Error(`Error creating agreement: ${error.message}`);
    return AgreementSchema.parse(data);
  }

  async getById(id: string): Promise<Agreement | null> {
    const { data, error } = await this.supabase
      .from('agreements')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching agreement: ${error.message}`);
    if (!data) return null;
    return AgreementSchema.parse(data);
  }

  async update(id: string, updates: Partial<Agreement>): Promise<Agreement> {
    assertUuid(id, 'agreement_id');
    if (updates.agency_id) assertUuid(updates.agency_id, 'agency_id');
    if (updates.created_by) assertUuid(updates.created_by, 'created_by');

    const { data, error } = await this.supabase
      .from('agreements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating agreement: ${error.message}`);
    return AgreementSchema.parse(data);
  }

  async list(filters?: { status?: string; client_id?: string }): Promise<Agreement[]> {
    let query = this.supabase.from('agreements').select('*').is('deleted_at', null);
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.client_id) query = query.eq('client_id', filters.client_id);
    
    const { data, error } = await query;
    if (error) throw new Error(`Error listing agreements: ${error.message}`);
    return data.map(d => AgreementSchema.parse(d));
  }
}
