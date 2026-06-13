#!/usr/bin/env node
/** Production closure — Agreement + Dashboard. */
import { spawnSync } from 'node:child_process';

const args = ['scripts/agreement-dashboard-e2e.mjs', 'https://immisign.vercel.app', 'ritiklabs', '--production', '--strict'];
const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: process.cwd() });
process.exit(r.status ?? 1);
