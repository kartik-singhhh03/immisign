import { createClient } from '../server';

export async function getDocuments() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('documents').select('*');
  
  if (error) throw error;
  return data;
}

export async function getDocumentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*, agreement:agreements(*)')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}
