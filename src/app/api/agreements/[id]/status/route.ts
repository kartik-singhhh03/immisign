// @ts-nocheck
import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { signwellClient } from '@/lib/signwell/client';
import { handleServerError } from '@/lib/utils/errors';
import { logAuditAction } from '@/lib/services/audit.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { agency } = await requireAgency();
    
    // Retrieve asynchronous params properly
    const { id: agreementId } = await params;

    const supabase = await createClient();

    // Make sure they own this document cleanly via RLS context
    const { data: agreement, error } = await supabase
       .from('agreements')
       .select('id, signwell_document_id')
       .eq('id', agreementId)
       .eq('agency_id', agency.id)
       .single();

    if (error || !agreement || !agreement.signwell_document_id) {
       return NextResponse.json({ error: 'Agreement tracking info missing or invalid' }, { status: 404 });
    }

    // Ping external service
    const statusData = await signwellClient.getDocument(agreement.signwell_document_id);

    return NextResponse.json({ 
        id: statusData.id,
        status: statusData.status,
        archived: statusData.archived,
        signers: statusData.signers.map(s => ({
            name: s.name,
            email: s.email,
            status: s.status
        }))
    });

  } catch (err: any) {
    const safeErr = handleServerError(err);
    return NextResponse.json(safeErr, { status: 500 });
  }
}
