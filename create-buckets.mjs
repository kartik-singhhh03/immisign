import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) {
    let val = match[2];
    if (val.endsWith('"')) val = val.slice(0, -1);
    process.env[match[1]] = val;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function createBuckets() {
  const bucketsToCreate = ['documents', 'agreements', 'secure_documents', 'avatars'];
  
  for (const name of bucketsToCreate) {
    const isPublic = name === 'avatars';
    const { data, error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      allowedMimeTypes: [],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`[OK] Bucket '${name}' already exists.`);
      } else {
        console.log(`[ERROR] creating bucket '${name}':`, error.message);
      }
    } else {
      console.log(`[OK] Created bucket '${name}'`);
    }
  }
}

createBuckets();
