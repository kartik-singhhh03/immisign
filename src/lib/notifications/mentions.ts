import type { SupabaseClient } from '@supabase/supabase-js';

const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;

export function parseMentions(content: string): string[] {
  const matches = content.matchAll(MENTION_REGEX);
  return [...new Set([...matches].map((m) => m[1].toLowerCase()))];
}

export async function resolveMentionedUserIds(
  supabase: SupabaseClient,
  agencyId: string,
  handles: string[],
): Promise<string[]> {
  if (!handles.length) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('agency_id', agencyId);

  if (!users?.length) return [];

  const ids: string[] = [];
  for (const handle of handles) {
    const match = users.find((u) => {
      const emailLocal = u.email?.split('@')[0]?.toLowerCase();
      const nameSlug = u.full_name
        ?.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9._-]/g, '');
      return emailLocal === handle || nameSlug === handle || nameSlug?.includes(handle);
    });
    if (match) ids.push(match.id);
  }
  return [...new Set(ids)];
}
