import { createClient } from '@supabase/supabase-js';

export async function magicLinkLogin(page, env, email, baseUrl) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !linkData?.properties?.action_link) {
    throw new Error(error?.message || 'magic link failed');
  }
  await page.goto(linkData.properties.action_link, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('/login'),
    { timeout: 60000 },
  );
  if (page.url().includes('/onboarding')) {
    throw new Error('Magic link landed on onboarding');
  }
}
