#!/usr/bin/env node
/** Send Document E2E only (reuses browser verify helpers). */
import { spawnSync } from 'node:child_process';

const env = process.env;
const base = process.argv[2] || 'http://localhost:3001';
const slug = process.argv[3] || 'avc-migration-live';

// Run send-document-browser-audit after ensuring dev server up
const audit = spawnSync(process.execPath, ['scripts/send-document-browser-audit.mjs', base, slug], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

if (audit.status !== 0) process.exit(audit.status || 1);

// Copy screenshot
import fs from 'node:fs';
import path from 'node:path';
const src = path.join('scripts', 'send-document-audit-proof.png');
const dest = path.join('docs', 'verification-screenshots', '11-4-send-document-dispatch.png');
if (fs.existsSync(src)) fs.copyFileSync(src, dest);
console.log('SCREENSHOT', dest);
process.exit(0);
