import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceApiContext } from '@/lib/auth/workspace-api';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';
import { z } from 'zod';

const createSchema = z.object({
  client_id: z.string().uuid().optional(),
  issued_stage: z.enum(['during_matter', 'on_completion']).optional(),
  notes: z.string().trim().max(2000).optional(),
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
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { searchParams } = new URL(req.url);
  const agreementId = searchParams.get('agreement_id');
  const approvalId = searchParams.get('approval_id');
  const fileSource = searchParams.get('file_source') as
    | 'agreement'
    | 'application_approval'
    | null;
  const fileId = searchParams.get('file_id');

  const service = new ServiceStatementService(ctx.supabase);
  try {
    const statements = await service.listForClient(ctx.agencyId, params.id, {
      agreementId: agreementId || undefined,
      approvalId: approvalId || undefined,
      fileSource: fileSource || undefined,
      fileId: fileId || undefined,
    });
    return NextResponse.json({ success: true, statements });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load statements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getWorkspaceApiContext();
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const service = new ServiceStatementService(ctx.supabase);
  try {
    const statement = await service.createDraft(ctx.agencyId, ctx.userId, {
      client_id: params.id,
      ...parsed.data,
      services_notes: parsed.data.services_notes || parsed.data.notes,
    });
    return NextResponse.json({ success: true, statement }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create statement';
    const status = message === 'Client not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
