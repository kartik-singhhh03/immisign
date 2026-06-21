#!/usr/bin/env node
/**
 * Pre-release security scan — secrets and placeholder patterns.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PATTERNS = [
  { name: 'sequential_ones', regex: /11111111/g },
  { name: 'sequential_zeros', regex: /00000000/g },
  { name: 'demo_keyword', regex: /\bdemo\b/i },
  { name: 'mock_keyword', regex: /\bmock\b/i },
  { name: 'placeholder_keyword', regex: /\bplaceholder\b/i },
  { name: 'example_com', regex: /example\.com/i },
  { name: 'fake_keyword', regex: /\bfake\b/i },
];

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'docs/e2e-evidence',
  'dist',
  'build',
]);

const SKIP_FILES = new Set([
  '.env.local.restored',
  '.env.vercel',
]);

const SECRET_FILES = ['.env', '.env.local', '.env.production'];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (!SKIP_FILES.has(ent.name)) out.push(full);
  }
  return out;
}

function scanContent(file, content) {
  const hits = [];
  for (const p of PATTERNS) {
    p.regex.lastIndex = 0;
    if (p.regex.test(content)) hits.push(p.name);
  }
  if (/sk_live_|sk_test_|re_[A-Za-z0-9]{20,}|eyJhbGci/.test(content)) {
    hits.push('possible_secret_in_source');
  }
  return hits;
}

function gitStagedSecretFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean).filter((f) => SECRET_FILES.some((s) => f === s || f.endsWith(s)));
  } catch {
    return [];
  }
}

function gitTrackedEnvFiles() {
  try {
    const out = execSync('git ls-files', { encoding: 'utf8' });
    return out.split(/\r?\n/).filter((f) => /^\.env/.test(f));
  } catch {
    return [];
  }
}

const root = process.cwd();
const files = walk(root).filter((f) => /\.(ts|tsx|js|mjs|json|sql|md|env.*)$/.test(f) || f.endsWith('.env.local'));
const findings = [];
for (const file of files) {
  const rel = path.relative(root, file);
  if (rel.startsWith('..')) continue;
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const hits = scanContent(rel, content);
  if (hits.length) findings.push({ file: rel, hits: [...new Set(hits)] });
}

const stagedSecrets = gitStagedSecretFiles();
const trackedEnv = gitTrackedEnvFiles();

const report = {
  timestamp: new Date().toISOString(),
  patternFindings: findings.length,
  stagedSecretFiles: stagedSecrets,
  trackedEnvFiles: trackedEnv,
  safeToPushSecrets: stagedSecrets.length === 0,
  sampleFindings: findings.slice(0, 40),
};

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(
  'docs/SECURITY_AUDIT_REPORT.md',
  [
    '# Security Audit Report',
    '',
    `**Generated:** ${report.timestamp}`,
    '',
    `## Summary`,
    '',
    `- Pattern scan hits (informational): **${report.patternFindings}** files`,
    `- Secret files staged for commit: **${stagedSecrets.length ? stagedSecrets.join(', ') : 'None'}**`,
    `- .env* tracked in git: **${trackedEnv.length ? trackedEnv.join(', ') : 'None'}**`,
    `- Safe to push (no env secrets staged): **${report.safeToPushSecrets ? 'YES' : 'NO'}**`,
    '',
    '## Staged secret files',
    stagedSecrets.length ? stagedSecrets.map((f) => `- ${f}`).join('\n') : '_None_',
    '',
    '## Tracked env files in git',
    trackedEnv.length ? trackedEnv.map((f) => `- ${f}`).join('\n') : '_None_',
    '',
    '## Pattern matches (review — may include false positives in docs/tests)',
    '',
    '| File | Patterns |',
    '|------|----------|',
    ...report.sampleFindings.map((f) => `| ${f.file} | ${f.hits.join(', ')} |`),
    report.patternFindings > 40 ? `\n_… and ${report.patternFindings - 40} more._` : '',
  ].join('\n'),
);

console.log(JSON.stringify({ safeToPushSecrets: report.safeToPushSecrets, patternFindings: report.patternFindings }, null, 2));
