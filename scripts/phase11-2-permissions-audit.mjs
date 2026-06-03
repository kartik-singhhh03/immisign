#!/usr/bin/env node
/**
 * Static permissions matrix vs db-roles.ts (Phase 11.2)
 */
import fs from 'fs';

const roles = ['owner', 'admin', 'manager', 'agent', 'support', 'viewer'];

function read(rel) {
  return fs.readFileSync(rel, 'utf8');
}

const dbRoles = read('src/lib/auth/db-roles.ts');
const routeAccess = read('src/lib/auth/route-access.ts');
const shell = read('src/components/layout/dashboard-shell.tsx');
const settings = read('src/features/settings/components/SettingsPage.tsx');
const billing = read('src/features/billing/components/BillingPage.tsx');
const checkout = read('src/app/api/stripe/checkout/route.ts');

const matrix = {
  billing_page: { owner: true, admin: true, manager: false, agent: false, support: false, viewer: false },
  billing_checkout_api: { owner: true, admin: true, manager: false, agent: false, support: false, viewer: false },
  settings_write: { owner: true, admin: true, manager: true, agent: true, support: false, viewer: false },
  settings_team: { owner: true, admin: true, manager: false, agent: false, support: false, viewer: false },
  templates_new: { owner: true, admin: true, manager: true, agent: true, support: false, viewer: false },
};

const codeChecks = [
  { name: 'checkout_owner_admin_gate', pass: checkout.includes("['owner', 'admin']") },
  { name: 'settings_uses_db_roles_helper', pass: settings.includes('isSettingsRestrictedForUiRole') },
  { name: 'billing_uses_db_roles_helper', pass: billing.includes('isBillingRestrictedForUiRole') },
  { name: 'shell_billing_lock', pass: shell.includes('hasBillingAccess') },
  { name: 'shell_settings_lock', pass: shell.includes('hasSettingsAccess') },
  { name: 'route_access_billing', pass: routeAccess.includes("root === 'billing'") },
];

const uiRoleMap = {
  Owner: 'owner',
  Admin: 'admin',
  'Migration Agent': 'agent',
  'Case Manager': 'manager',
  Assistant: 'support',
  'Read-only staff': 'viewer',
};

console.log(JSON.stringify({ matrix, uiRoleMap, codeChecks, note: 'Manual UI verification still required per role in dev simulator' }, null, 2));

const failed = codeChecks.filter((c) => !c.pass);
if (failed.length) {
  console.error('FAILED', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
console.log('STATIC_PERMISSIONS_OK');
