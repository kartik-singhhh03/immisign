import fs from 'node:fs';

export function loadEnvFromFiles() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

export function resolveDatabaseUrlCandidates(env) {
  if (env.DATABASE_URL?.trim()) return [env.DATABASE_URL.trim()];

  const password = env.SUPABASE_DB_PASSWORD || env.POSTGRES_PASSWORD;
  if (!password) return [];

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return [];

  const ref = match[1];
  const region = env.SUPABASE_DB_REGION || 'ap-southeast-2';
  const enc = encodeURIComponent(password);

  return [
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
  ];
}

export async function connectPgClient() {
  const pg = (await import('pg')).default;
  const env = loadEnvFromFiles();
  const candidates = resolveDatabaseUrlCandidates(env);
  if (!candidates.length) {
    throw new Error('MISSING_DATABASE_CREDENTIALS');
  }

  let lastErr;
  for (const connectionString of candidates) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const host = connectionString.includes('@') ? connectionString.split('@')[1].split('/')[0] : 'unknown';
      console.log('CONNECTED', host);
      return client;
    } catch (err) {
      lastErr = err;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastErr || new Error('Could not connect to database');
}
