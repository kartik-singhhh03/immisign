import pg from 'pg';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL or SUPABASE_DB_URL');
  process.exit(1);
}

async function runSeed() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to database.");
    
    const seedSql = fs.readFileSync('supabase/seed.sql', 'utf8');
    console.log("Executing seed.sql...");
    
    await client.query(seedSql);
    console.log("Seed executed successfully.");
  } catch (err) {
    console.error("Error executing seed:", err);
  } finally {
    await client.end();
  }
}

runSeed();
