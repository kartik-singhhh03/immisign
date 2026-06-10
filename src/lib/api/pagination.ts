import { NextResponse } from 'next/server';

const SORT_WHITELIST = new Set([
  'created_at',
  'updated_at',
  'name',
  'email',
  'file_name',
  'status',
  'agreement_number',
  'client_name',
]);

export function parsePaginationParams(
  sp: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
) {
  const page = Math.max(1, Number(sp.get('page') || defaults.page || 1));
  const maxLimit = defaults.maxLimit ?? 100;
  const limit = Math.min(maxLimit, Math.max(1, Number(sp.get('limit') || defaults.limit || 10)));
  const offset = (page - 1) * limit;
  const search = sp.get('search')?.trim() || '';
  const sortRaw = sp.get('sort') || 'created_at';
  const sort = SORT_WHITELIST.has(sortRaw) ? sortRaw : 'created_at';
  const ascending = sp.get('direction') === 'asc';
  const status = sp.get('status')?.trim() || '';
  const mimeType = sp.get('mimeType')?.trim() || '';
  const dateFrom = sp.get('dateFrom')?.trim() || '';
  const dateTo = sp.get('dateTo')?.trim() || '';
  return { page, limit, offset, search, sort, ascending, status, mimeType, dateFrom, dateTo };
}

export function paginatedJson<T>(data: T[], count: number, page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data,
    count,
    page,
    limit,
    totalPages: count > 0 ? Math.ceil(count / limit) : 0,
  });
}
