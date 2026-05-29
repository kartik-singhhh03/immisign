import { createClient } from '../server';

export async function getClients() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('clients').select('*');
  
  if (error) throw error;
  return data;
}

export async function getClientById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*, agreements(*)')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}
