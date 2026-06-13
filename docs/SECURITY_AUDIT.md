# Security Audit

**Date:** 2026-06-13

## Gitignore

| Path | Ignored |
|------|---------|
| `.env` | Yes |
| `.env.local` | Yes |
| `.env.production` | Yes |
| `.env*.local` | Yes |

## Tracked Env Files (safe)

- `.env.example` — placeholder values only
- `.env.production.example` — placeholder values only

## Committed Secrets Scan

- No live `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or `SIGNWELL_API_KEY` values found in tracked source files
- Scripts reference env var **names** only (expected)
- `docs/e2e-evidence/` may contain **signed storage URLs** (time-limited JWTs) — not committed service keys

## Risk Items

| Item | Severity | Action |
|------|----------|--------|
| E2E evidence JSON with signed URLs | Low | Do not commit if contains long-lived tokens; rotate if leaked |
| `critical-errors.md` references mock key string | Info | Documentation only |

## Verdict

**PASS** — No credentials in git index. `.env.local` correctly gitignored.
