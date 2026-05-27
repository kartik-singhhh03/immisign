# 🛡️ ImmiSign — Premium Legal-Tech Multi-Tenant SaaS Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkartik-singhhh03%2Fimmisign)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-emerald?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Typecheck Passing](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript&logoColor=white)](#)
[![OMARA Compliant](https://img.shields.io/badge/Compliance-OMARA%20Australia-0D9F8C)](#)

ImmiSign is a state-of-the-art **Multi-Tenant Enterprise SaaS Platform** tailored exclusively for Australian Registered Migration Agencies (RMAs) and legal professionals. It streamlines agreement creation, milestone billing, clause libraries management, and OMARA-mandated document workflows within a secure, isolated sandbox environment.

---

## ✨ Enterprise Product Ecosystem Features

### 🏢 1. Isolated Multi-Tenant Architecture
- **Branding Accents Integration**: Dynamic corporate branding propagates per workspace (Emerald Green, Sapphire Blue, Amber Gold, Slate Gray) modifying sidebar headers, active states, and practitioner initials live.
- **Dynamic Catch-All Page Routing**: Zero configuration dynamic routing capturing active subdomains under `/workspace/[agency]/[path]` to feed workspace states seamlessly.

### 🔑 2. SSO Authentication & Domain Detection
- **Auto-Domain Mapping Alert**: Typing corporate emails instantly resolves and displays the corresponding workspace name and subdomain.
- **Collapsible Developer Test Accounts**: Quick login credentials for Owner, Migration Agent, Case Manager, and Assistant privileges to review granular permissions.
- **SSO Google & Microsoft Entra ID**: High-fidelity single sign-on buttons styled with premium custom SVGs.

### 🧙 3. 5-Step Workspace Onboarding Wizard
1. **Workspace Profile**: Domain availability validation checks.
2. **Dynamic Brand Seeding**: Color accent pickers and logo initials configurations.
3. **OMARA Team Allocations**: Direct team member invites with role selector controls.
4. **Document specialty seeding**: Standard OMARA points-test and spouse retainer agreement libraries.
5. **Secure Database Provisioning Loader**: Fluid environment provisioning simulations.

### ⚙️ 4. Advanced Settings Panel
- **Live Logo initials & Color Preview**: Changing parameters reflects live updates across the active session instantly.
- **Practitioner Invite drawer**: Form validations to provision new seats and update lists dynamically.
- **Tabular Roles Permissions Matrix**: Deep comparison capabilities indicating view/write locks.
- **Security session revocation logs**: Session details with IP address detection and remote termination controls.

### 💳 5. Stripe-Inspired Billing Usage & Upgrades
- **License utilization progress bars**: Vivid meters showing active seats, secure documents, and active agreement signatures.
- **Capacity Provision Dialog**: Pop-up window billing card configurations for additional seat purchases.
- **PDF Audit trail**: History lists of past invoices with simulated download triggers.

---

## 🛠️ Staging Testing Accounts Matrix

Use these pre-seeded testing logins in the **Developer Portal** on `/login` to explore granular access lockouts:

| Email | Target Simulated Role | Accessible Menu Scope | Restrictions / Locks |
| :--- | :--- | :--- | :--- |
| `owner@demoagency.com` | **Agency Owner** | 100% Full Access | None |
| `agent@demoagency.com` | **Migration Agent** | Intakes, Agreements, Clients | Blocked from Stripe Billing, settings updates require RMA approvals |
| `manager@demoagency.com` | **Case Manager** | Documents, Clients, Agreements | Blocked from Billing, read-only settings view |
| `assistant@demoagency.com` | **Assistant** | Agreements drafting, client intake views | Restricted Settings edits, hidden Billing, blocked from DHA exports |

---

## 🚀 Easy Vercel Deployment

ImmiSign is fully optimized for **Vercel** with optimized security rules and caching configurations:

### 1. Prerequisite Checks
Confirm that standard TypeScript validation rules pass cleanly in the workspace environment:
```bash
npx tsc --noEmit
```

### 2. Standard Production Build
Compile optimized static page bundles locally to inspect sizes:
```bash
npm run build
```

### 3. Deploy
Push the project directly to your GitHub repository and link it to [Vercel](https://vercel.com). Vercel will automatically discover the Next.js framework, configure serverless routes, and inject these security headers:
- `X-Frame-Options: DENY` (Anti-clickjacking protection)
- `X-Content-Type-Options: nosniff` (MIME sniff block)
- `Strict-Transport-Security` (365 days HSTS caching)
- `Permissions-Policy` (Microphone, Camera disable locks)
- `.vercelignore` file to ignore logs, local `.next` builds, and dev caches during pushes.
