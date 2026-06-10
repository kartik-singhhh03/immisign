import { connectPgClient } from './lib/resolve-database-url.mjs';

const sql = `
DROP POLICY IF EXISTS "Owners and admins view webhook events" ON public.webhook_events;
CREATE POLICY "Owners and admins view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id = public.get_tenant());

DROP POLICY IF EXISTS "Owners and admins view integration health logs" ON public.integration_health_logs;
CREATE POLICY "Owners and admins view integration health logs"
  ON public.integration_health_logs FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id = public.get_tenant());
`;

const client = await connectPgClient();
try {
  await client.query(sql);
  console.log('RLS_POLICIES_APPLIED');
} catch (e) {
  console.error('FAILED', e.message);
  process.exit(1);
} finally {
  await client.end();
}
