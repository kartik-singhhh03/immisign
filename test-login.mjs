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
const supabase = createClient(supabaseUrl, anonKey);

async function testLogin() {
  console.log("Attempting login as owner@demoagency.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'owner@demoagency.com',
    password: 'password123'
  });
  
  if (error) {
    console.log("Login failed:", error.message);
  } else {
    console.log("Login successful! Session retrieved.");
    console.log("User ID:", data.user.id);
  }
}

testLogin();
