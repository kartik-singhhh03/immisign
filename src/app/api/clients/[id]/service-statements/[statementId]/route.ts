import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';
import { z } from 'zod';

const updateSchema = z.object({
  client_name: z.string().optional(),
  client_number: z.string().optional(),
  client_email: z.string().optional(),
  client_phone: z.string().optional(),
  visa_subclass: z.string().optional(),
  agreement_id: z.string().uuid().optional().nullable(),
  approval_id: z.string().uuid().optional().nullable(),
  matter_type_id: z.string().uuid().optional().nullable(),
  services_completed_at: z.string().optional().nullable(),
  services_notes: z.string().max(4000).optional().nullable(),
  issued_stage: z.enum(['during_matter', 'on_completion']).optional(),
  selected_service_ids: z.array(z.string().uuid()).optional(),
  professional_fee: z.number().min(0).optional(),
  government_fee: z.number().min(0).optional(),
  disbursements: z.number().min(0).optional(),
  quoted_professional_fee: z.number().min(0).optional(),
  payment_terms: z.string().optional().nullable(),
  payment_dates: z.string().optional().nullable(),
  payment_methods: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; statementId: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const service = new ServiceStatementService(ctx.supabase);
  try {
    const statement = await service.getById(ctx.agencyId, params.id, params.statementId);
    return NextResponse.json({ success: true, statement });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; statementId: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  const blocked = ['signed_at', 'acknowledged_at', 'sent_at', 'viewed_at', 'generated_at', 'issued_at'];
  if (blocked.some((k) => k in body)) {
    return NextResponse.json(
      { error: 'Signature and audit timestamps are system-managed and cannot be edited manually.' },
      { status: 403 },
    );
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const service = new ServiceStatementService(ctx.supabase);
  try {
    const statement = await service.updateDraft(
      ctx.agencyId,
      params.id,
      params.statementId,
      parsed.data,
    );
    return NextResponse.json({ success: true, statement });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
