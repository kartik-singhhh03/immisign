const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function provision() {
  console.log("Provisioning new test tenant...");

  // 1. Create a new Auth User
  const email = `testowner_${Date.now()}@demoagency.com`;
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  });

  if (authErr) {
    console.error("Failed to create auth user:", authErr);
    process.exit(1);
  }

  const userId = authUser.user.id;
  console.log(`Created Auth User: ${email} with ID: ${userId}`);

  // 2. Create Agency
  const { data: agency, error: agencyErr } = await supabase.from('agencies').insert({
    name: 'Valid Cloud Agency',
    slug: `valid-agency-${Date.now()}`,
    email: email
  }).select('id').single();

  if (agencyErr) {
    console.error("Failed to create agency:", agencyErr);
    process.exit(1);
  }

  const agencyId = agency.id;
  console.log(`Created Agency with ID: ${agencyId}`);

  // 3. Create Public User Profile
  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    agency_id: agencyId,
    email: email,
    full_name: 'Test Cloud Owner',
    role: 'owner'
  });

  if (userErr) {
    console.error("Failed to create public user profile:", userErr);
    process.exit(1);
  }
  
  // 4. Update the test-backend-pipeline.js with the newly generated IDs
  const fs = require('fs');
  const testFile = 'test-backend-pipeline.js';
  let content = fs.readFileSync(testFile, 'utf8');
  content = content.replace(/agencyId: '[^']+'/, `agencyId: '${agencyId}'`);
  content = content.replace(/userId: '[^']+'/, `userId: '${userId}'`);
  // also need to update the login to use the new email
  // The login uses UI clicks, so it clicks "Rajwant Singh".
  // Let's modify test-backend-pipeline to login via fetch to /auth/v1/token instead of UI?
  // Or we just update the login page demo accounts to use this new email!
  
  fs.writeFileSync(testFile, content);

  console.log("Provisioning complete!");
  console.log(`Agency ID: ${agencyId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Email: ${email}`);
}

provision();
