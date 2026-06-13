#!/usr/bin/env node
/** Production closure — Application Approval. */
import { spawnSync } from 'node:child_process';

const args = ['scripts/application-approval-e2e.mjs', 'https://immisign.vercel.app', 'ritiklabs', '--production', '--strict'];
const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: process.cwd() });
process.exit(r.status ?? 1);
