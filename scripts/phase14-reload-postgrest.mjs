#!/usr/bin/env node
import { connectPgClient } from './lib/resolve-database-url.mjs';

const client = await connectPgClient();
await client.query(`SELECT pg_notify('pgrst', 'reload schema')`);
console.log('PostgREST schema reload notified');
await client.end();
