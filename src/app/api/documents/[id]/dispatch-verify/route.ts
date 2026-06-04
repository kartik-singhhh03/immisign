import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Confirms dispatch persisted before UI shows success. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const agencyId = _req.nextUrl.searchParams.get('agencyId');
  if (!agencyId) {
    return NextResponse.json({ success: false, error: 'agencyId required' }, { status: 400 });
  }

  const { data: doc, error } = await supabase
    .from('documents')
    .select(
      'id, signwell_document_id, signwell_status, signwell_sent_at, signwell_dispatch_error, signwell_signing_links',
    )
    .eq('id', documentId)
    .eq('agency_id', agencyId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
  }

  const { count: activityCount } = await supabase
    .from('activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('reference_id', documentId)
    .eq('reference_type', 'document');

  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('entity_id', documentId);

  const confirmed = Boolean(doc.signwell_document_id);

  return NextResponse.json({
    success: true,
    confirmed,
    signwellDocumentId: doc.signwell_document_id,
    signwellStatus: doc.signwell_status,
    signwellSentAt: doc.signwell_sent_at,
    dispatchError: doc.signwell_dispatch_error,
    signingLinks: doc.signwell_signing_links,
    activityLogCount: activityCount || 0,
    notificationCount: notificationCount || 0,
  });
}
