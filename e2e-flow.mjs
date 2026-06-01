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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Using anon key to simulate client-side behavior with RLS
const supabase = createClient(supabaseUrl, anonKey);

async function runE2E() {
  console.log("--- E2E FLOW START ---");
  
  // 1. Login
  console.log("1. Login...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'owner@demoagency.com',
    password: 'password123'
  });
  if (authError) throw new Error(`Login failed: ${authError.message}`);
  console.log("   -> Login success. User:", authData.user.id);
  
  // Get the agency ID for this user by querying agencies (RLS should allow this now)
  const { data: agency, error: agencyError } = await supabase.from('agencies').select('*').limit(1).single();
  if (agencyError) throw new Error(`Agency lookup failed: ${agencyError.message}`);
  const agencyId = agency.id;
  console.log("   -> Agency retrieved via RLS:", agencyId);

  // 2. Create Client
  console.log("2. Create Client...");
  const newClient = {
    agency_id: agencyId,
    name: 'E2E Test Client',
    email: 'e2eclient@example.com',
    phone: '555-0000'
  };
  const { data: clientData, error: clientError } = await supabase.from('clients').insert(newClient).select().single();
  if (clientError) throw new Error(`Create client failed: ${clientError.message}`);
  console.log("   -> Client created:", clientData.id);
  
  // 3. Create Agreement
  console.log("3. Create Agreement...");
  const newAgreement = {
    agency_id: agencyId,
    client_id: clientData.id,
    created_by: authData.user.id,
    title: 'E2E Test Agreement',
    agreement_number: 'E2E-001',
    status: 'draft',
    client_name: clientData.name,
    client_email: clientData.email,
    total_signers: 1
  };
  const { data: agreementData, error: agreementError } = await supabase.from('agreements').insert(newAgreement).select().single();
  if (agreementError) throw new Error(`Create agreement failed: ${agreementError.message}`);
  console.log("   -> Agreement created:", agreementData.id);
  
  // 4. Upload Document
  console.log("4. Upload Document...");
  const fileContent = "This is a dummy PDF content for E2E test.";
  const fileName = `e2e_test_${Date.now()}.pdf`;
  const { data: uploadData, error: uploadError } = await supabase.storage.from('documents').upload(`${agencyId}/${fileName}`, fileContent, {
    contentType: 'application/pdf',
    upsert: false
  });
  if (uploadError) throw new Error(`Document upload failed: ${uploadError.message}`);
  console.log("   -> Document uploaded:", uploadData.path);
  
  // 5. Open Library (Verify DB and Storage)
  console.log("5. Verify Database and Storage...");
  const { count: clientsCount, error: countErr1 } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  const { count: agreementsCount, error: countErr2 } = await supabase.from('agreements').select('*', { count: 'exact', head: true });
  
  console.log("   -> Clients Count:", clientsCount);
  console.log("   -> Agreements Count:", agreementsCount);
  
  const { data: files, error: filesErr } = await supabase.storage.from('documents').list(agencyId);
  console.log("   -> Documents in Storage:", files?.length || 0);
  
  // 6. Logout and Login again
  console.log("6. Logout...");
  await supabase.auth.signOut();
  console.log("   -> Logout success");
  
  console.log("7. Re-Login...");
  const { error: reloginErr } = await supabase.auth.signInWithPassword({
    email: 'owner@demoagency.com',
    password: 'password123'
  });
  if (reloginErr) throw new Error(`Re-login failed: ${reloginErr.message}`);
  console.log("   -> Re-login success");
  
  console.log("--- E2E FLOW COMPLETED SUCCESSFULLY ---");
}

runE2E().catch(console.error);
