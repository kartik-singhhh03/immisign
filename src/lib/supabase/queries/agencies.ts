import { createClient } from '../server';

export async function getAgencies() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('agencies').select('*');
  
  if (error) throw error;
  return data;
}

export async function getAgencyBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('slug', slug)
    .single();
    
  if (error) throw error;
  return data;
}
