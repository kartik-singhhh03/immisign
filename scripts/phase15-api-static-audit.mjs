#!/usr/bin/env node
/**
 * Static audit of API route handlers — JSON body, try/catch, logging patterns.
 */
import fs from 'node:fs';
import path from 'node:path';

const API_ROOT = 'src/app/api';
const PREFIXES = [
  'agreements',
  'documents',
  'approvals',
  'tasks',
  'notifications',
  'search',
  'dashboard',
  'settings',
  'stripe',
  'team',
  'activity',
];

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name === 'route.ts') acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
}

const routes = walk(API_ROOT);
const report = { timestamp: new Date().toISOString(), routes: [], summary: {} };

for (const file of routes.sort()) {
  const rel = file.replace('src/app/api/', '');
  const inScope = PREFIXES.some((p) => rel.startsWith(p));
  if (!inScope) continue;

  const src = fs.readFileSync(file, 'utf8');
  const handlers = [...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]);
  const hasTryCatch = /try\s*\{/.test(src);
  const hasWithApiRoute = /withApiRoute/.test(src);
  const hasHandleServerError = /handleServerError/.test(src);
  const returnsJson = /NextResponse\.json/.test(src);
  const hasConsoleError = /console\.(error|warn)/.test(src);

  let status = 'OK';
  const gaps = [];
  if (!returnsJson) gaps.push('no NextResponse.json');
  if (!hasTryCatch && !hasWithApiRoute && !hasHandleServerError) gaps.push('no try/catch or withApiRoute');
  if (!hasConsoleError && !hasWithApiRoute) gaps.push('no failure logging');

  if (gaps.length) status = gaps.length === 1 && gaps[0] === 'no failure logging' ? 'WARN' : 'GAP';

  report.routes.push({ path: `/api/${rel.replace('/route.ts', '')}`, handlers, status, gaps });
}

const counts = { OK: 0, WARN: 0, GAP: 0 };
for (const r of report.routes) counts[r.status] = (counts[r.status] || 0) + 1;
report.summary = counts;

const out = path.join('docs', 'verification-screenshots', 'phase15-api-static-audit.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log('Wrote', out);
