import { createClient } from '../server';

export async function getAgreements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agreements')
    .select('*, client:clients(*), creator:users(*)');
    
  if (error) throw error;
  return data;
}

export async function getAgreementById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agreements')
    .select('*, client:clients(*), creator:users(*), documents(*)')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}
