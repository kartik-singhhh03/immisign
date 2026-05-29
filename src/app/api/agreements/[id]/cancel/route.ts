// @ts-nocheck
import { NextResponse } from 'next/server';
import { requireAuth, requireAgency } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { signwellClient } from '@/lib/signwell/client';
import { handleServerError } from '@/lib/utils/errors';
import { logAuditAction } from '@/lib/services/audit.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { agency } = await requireAgency();
    
    // Process async params mapping 
    const { id: agreementId } = await params;

    const supabase = await createClient();

    // Context verify
    const { data: agreement, error } = await supabase
       .from('agreements')
       .select('id, signwell_document_id')
       .eq('id', agreementId)
       .eq('agency_id', agency.id)
       .single();

    if (error || !agreement || !agreement.signwell_document_id) {
       return NextResponse.json({ error: 'Agreement not configured for cancellation' }, { status: 404 });
    }

    // Cancel Document out of SignWell lifecycle
    await signwellClient.cancelDocument(agreement.signwell_document_id);

    // Persist internally
    const admin = createAdminClient();
    await admin.from('agreements').update({
       status: 'cancelled',
       signwell_status: 'Canceled'
    }).eq('id', agreementId);

    // Log the audit
    await logAuditAction('signature_requested', 'agreement', agreementId, { 
      action: 'cancelled',
      signwell_document_id: agreement.signwell_document_id
    });

    return NextResponse.json({ message: 'Agreement effectively canceled internally and externally.' });

  } catch (err: any) {
    const safeErr = handleServerError(err);
    return NextResponse.json(safeErr, { status: 500 });
  }
}
