# Auto agent signatures (Phase 10)

## Behaviour

- **Agreements:** On send, the responsible RMA’s signature is embedded in the PDF (`agent_signed_at`, `agent_signature_url`, `agent_signature_text`). Only **client/external** signers are sent to SignWell.
- **Documents:** On send, the sender’s signature is recorded on the document row; only **external** recipients are sent to SignWell.

## RMA Team settings

Per RMA record (`rmas` table):

| Field | Description |
|-------|-------------|
| `signature_mode` | `upload` or `typed` |
| `signature_url` | Storage path for uploaded image |
| `signature_text` | Typed signature display name |

Configure under **Settings → RMA Team**. Falls back to the user’s default `user_signatures` entry if RMA fields are empty.

## Migration

Apply `supabase/migrations/20260603150000_auto_agent_signatures.sql`.

## Audit

Agreement send logs: `Agent signature automatically applied at send time.`

Document send activity: `Agent signature automatically applied at send time.` in the activity description.
