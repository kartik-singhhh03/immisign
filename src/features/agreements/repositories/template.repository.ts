import { SupabaseClient } from '@supabase/supabase-js';
import { Template, TemplateSchema } from '../types';

export class TemplateRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getById(id: string): Promise<Template | null> {
    const { data, error } = await this.supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching template: ${error.message}`);
    if (!data) return null;
    return TemplateSchema.parse(data);
  }

  async list(): Promise<Template[]> {
    const { data, error } = await this.supabase
      .from('templates')
      .select('*');
      
    if (error) throw new Error(`Error listing templates: ${error.message}`);
    return data.map(d => TemplateSchema.parse(d));
  }
}
