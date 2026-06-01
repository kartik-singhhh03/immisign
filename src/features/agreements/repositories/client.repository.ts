import { SupabaseClient } from '@supabase/supabase-js';
import { Client, ClientSchema } from '../types';

export class ClientRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(client: Partial<Client>): Promise<Client> {
    const { data, error } = await this.supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw new Error(`Error creating client: ${error.message}`);
    return ClientSchema.parse(data);
  }

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching client: ${error.message}`);
    if (!data) return null;
    return ClientSchema.parse(data);
  }
}
