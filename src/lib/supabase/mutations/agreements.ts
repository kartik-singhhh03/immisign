import { createClient } from '../server';

export async function createAgreement(payload: {
  client_id: string;
  title: string;
  metadata?: any;
}) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('agreements') as any)
    .insert([payload as any])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAgreement(id: string, updates: any) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('agreements') as any)
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAgreement(id: string) {
  const supabase = await createClient();
  const { error } = await (supabase.from('agreements') as any).delete().eq('id', id);

  if (error) throw error;
}
