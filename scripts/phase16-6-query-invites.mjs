import { connectPgClient } from './lib/resolve-database-url.mjs';

const c = await connectPgClient();
const r = await c.query(
  `SELECT email, role, accepted_at, created_at FROM invitations
   WHERE accepted_at IS NOT NULL ORDER BY accepted_at DESC LIMIT 5`,
);
console.log(JSON.stringify(r.rows, null, 2));
await c.end();
