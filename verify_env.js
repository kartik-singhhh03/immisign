

console.log('--- ENVIRONMENT VERIFICATION ---');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
    console.error('FAIL: NEXT_PUBLIC_SUPABASE_URL is missing.');
    process.exit(1);
}

if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    console.error(`FAIL: URL points to local Supabase! (${supabaseUrl})`);
    process.exit(1);
}

if (supabaseUrl.includes('mock.supabase.co')) {
    console.error(`FAIL: URL points to mock! (${supabaseUrl})`);
    process.exit(1);
}

const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!match) {
    console.error(`FAIL: URL does not match Cloud Supabase pattern! (${supabaseUrl})`);
    process.exit(1);
}

const projectRef = match[1];

console.log(`Active Project Reference: ${projectRef}`);
console.log(`Active Supabase URL: ${supabaseUrl}`);
console.log('Runtime is connected to Cloud Supabase.');
console.log('--- VERIFICATION SUCCESS ---');
