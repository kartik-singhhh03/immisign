import { createClient } from '../supabase/server';
import { getCurrentAgency } from '../supabase/auth';

export async function getTenantStoragePath(agreementId: string, fileName: string) {
  const agency = await getCurrentAgency();
  if (!agency) throw new Error('No agency context found');

  return `${agency.id}/${agreementId}/${fileName}`;
}

export async function uploadDocument(
  file: File, 
  agreementId: string, 
  bucket: 'documents' | 'agreements' = 'documents'
) {
  const supabase = await createClient();
  const path = await getTenantStoragePath(agreementId, file.name);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }
  
  return data;
}

export async function getSignedDownloadUrl(
  path: string, 
  bucket: 'documents' | 'agreements' = 'documents'
) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60); // 1 hour valid

  if (error) throw error;
  return data.signedUrl;
}
