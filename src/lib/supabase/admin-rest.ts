/** Minimal admin REST helper when Supabase JS client fetch fails in some Next runtimes. */
export async function adminRest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { data: null, error: 'Supabase admin not configured', status: 500 };
  }

  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return { data: null, error: text || res.statusText, status: res.status };
  }

  try {
    return { data: text ? (JSON.parse(text) as T) : null, error: null, status: res.status };
  } catch {
    return { data: null, error: 'Invalid JSON from Supabase', status: res.status };
  }
}
