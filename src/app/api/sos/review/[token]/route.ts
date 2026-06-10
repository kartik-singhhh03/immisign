import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ServiceStatementService } from '@/features/service-statements/services/service-statement.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const supabase = createAdminClient();
  const service = new ServiceStatementService(supabase);

  try {
    const statement = await service.getByToken(params.token);
    if (!statement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let documentUrl: string | null = null;
    if (statement.document_path) {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(statement.document_path, 3600);
      documentUrl = data?.signedUrl ?? null;
    }

    const { data: agency } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', statement.agency_id)
      .single();

    return NextResponse.json({
      success: true,
      statement: {
        id: statement.id,
        statement_number: statement.statement_number,
        status: statement.status,
        client_name: statement.client_name,
        acknowledged_at: statement.acknowledged_at,
        agency_name: agency?.name || 'Agency',
      },
      documentUrl,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
