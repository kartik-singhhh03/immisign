import { NextResponse } from 'next/server';
import { handleServerError } from '@/lib/utils/errors';

export function apiJson<T extends Record<string, unknown>>(
  body: T,
  status = 200,
): NextResponse {
  return NextResponse.json({ success: status < 400, ...body }, { status });
}

export function apiError(
  message: string,
  status = 500,
  extra?: Record<string, unknown>,
): NextResponse {
  console.error(`[API ${status}]`, message, extra ?? '');
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

export async function withApiRoute<T>(
  label: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err: unknown) {
    const safe = handleServerError(err);
    console.error(`[API] ${label}`, err);
    return NextResponse.json(
      {
        success: false,
        error: safe.message,
        code: safe.code,
      },
      { status: safe.statusCode },
    );
  }
}
