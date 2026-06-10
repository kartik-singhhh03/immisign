import type { SearchEntityType } from '../types/search.types'

const ENTITY_BASE_PRIORITY: Record<SearchEntityType, number> = {
  matter: 1000,
  agreement: 950,
  approval: 900,
  client: 800,
  document: 700,
  file_note: 600,
  sos: 550,
  notification: 400,
  activity: 350,
  command: 1200,
  navigation: 300,
}

/** Levenshtein distance for fuzzy matching */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function scoreMatch(
  query: string,
  target: string,
  entityType: SearchEntityType,
): number {
  const q = normalizeSearchText(query)
  const t = normalizeSearchText(target)
  if (!q || !t) return 0

  let score = ENTITY_BASE_PRIORITY[entityType]

  if (t === q) score += 500
  else if (t.startsWith(q)) score += 350
  else if (t.includes(q)) score += 200
  else {
    const words = t.split(/\s+/)
    const qWords = q.split(/\s+/)
    let wordHits = 0
    for (const qw of qWords) {
      if (words.some((w) => w.startsWith(qw) || w.includes(qw))) wordHits++
      else {
        const fuzzy = words.some((w) => {
          const dist = levenshtein(qw, w.slice(0, Math.max(w.length, qw.length)))
          const maxLen = Math.max(qw.length, w.length)
          return maxLen > 0 && dist / maxLen <= 0.35
        })
        if (fuzzy) wordHits += 0.5
      }
    }
    if (wordHits > 0) score += Math.round(wordHits * 80)
    else {
      const dist = levenshtein(q, t.slice(0, Math.min(t.length, q.length + 4)))
      const maxLen = Math.max(q.length, t.length)
      if (maxLen > 0 && dist / maxLen <= 0.4) score += 60
      else return 0
    }
  }

  // Boost file-number style exact prefixes (AGR-2026)
  if (/^[a-z]{2,4}-\d{4}/i.test(target) && normalizeSearchText(target).startsWith(q)) {
    score += 150
  }

  return score
}

export function sortByScore<T extends { score: number; label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

export function parseNaturalLanguage(query: string): {
  cleanedQuery: string
  filters: import('../types/search.types').SearchFilters
} {
  const q = query.trim()
  const lower = q.toLowerCase()
  const filters: import('../types/search.types').SearchFilters = {}

  if (/show\s+unsigned\s+agreements?/i.test(q)) {
    filters.entity = 'agreement'
    filters.signed = false
    return { cleanedQuery: '', filters }
  }
  if (/show\s+lodged\s+matters?/i.test(q)) {
    filters.stage = 'lodged'
    return { cleanedQuery: '', filters }
  }
  if (/show\s+awaiting\s+approval/i.test(q) || /awaiting\s+approval/i.test(q)) {
    filters.approval_status = 'pending'
    return { cleanedQuery: '', filters }
  }
  if (/today\s+notes?/i.test(q) || /notes?\s+today/i.test(q)) {
    filters.entity = 'file_note'
    filters.created = 'today'
    return { cleanedQuery: '', filters }
  }
  if (/my\s+matters?/i.test(q)) {
    filters.assigned_to_me = true
    return { cleanedQuery: lower.replace(/my\s+matters?/i, '').trim(), filters }
  }
  if (/ready\s+to\s+lodge/i.test(q)) {
    filters.stage = 'ready_to_lodge'
    return { cleanedQuery: '', filters }
  }
  if (/unsigned\s+agreements?/i.test(q)) {
    filters.entity = 'agreement'
    filters.signed = false
    return { cleanedQuery: '', filters }
  }

  return { cleanedQuery: q, filters }
}

export function matchCommandAction(
  query: string,
  actions: import('../types/search.types').QuickAction[],
): import('../types/search.types').QuickAction[] {
  const q = normalizeSearchText(query)
  if (!q) return []
  return actions
    .filter((action) =>
      action.keywords.some((kw) => {
        const k = normalizeSearchText(kw)
        return q.includes(k) || k.includes(q) || levenshtein(q, k) <= 2
      }),
    )
    .map((action) => ({
      ...action,
      score: scoreMatch(q, action.label, 'command'),
    })) as (import('../types/search.types').QuickAction & { score: number })[]
}
