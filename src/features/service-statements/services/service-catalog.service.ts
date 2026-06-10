import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveVisaSubclassKey } from '../lib/visa-subclass-key';
import type { ServiceCatalogItem } from '../types';

export class ServiceCatalogService {
  constructor(private supabase: SupabaseClient) {}

  async listAll(): Promise<ServiceCatalogItem[]> {
    const { data, error } = await this.supabase
      .from('service_catalog')
      .select('id, code, label, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as ServiceCatalogItem[];
  }

  async getDefaultSelectedIds(visaSubclass: string | null): Promise<string[]> {
    const key = resolveVisaSubclassKey(visaSubclass);
    const keys = [key, 'default'];

    for (const k of keys) {
      const { data, error } = await this.supabase
        .from('visa_service_templates')
        .select('service_catalog_id')
        .eq('visa_subclass_key', k)
        .eq('default_selected', true);

      if (error) throw new Error(error.message);
      if (data?.length) {
        return data.map((r) => r.service_catalog_id as string);
      }
    }

    return [];
  }
}
