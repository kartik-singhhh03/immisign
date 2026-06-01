import { createClient } from '../server';

export async function createClientRecord(payload: {
  first_name: string;
  last_name: string;
  email: string;
  visa_type?: string;
  phone?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('clients') as any)
    .insert([payload as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClientRecord(id: string, updates: any) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('clients') as any)
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient();
  const { error } = await (supabase.from('clients') as any).delete().eq('id', id);

  if (error) throw error;
}
