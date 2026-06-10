import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAgreementPreviewHtml } from '@/features/agreements/lib/agreement-preview-html';
import { PDFService } from '@/features/agreements/services/pdf.service';
import { normalizeFeeItemsFromForm } from '@/features/agreements/lib/fee-items';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { form, agency, rma, agreementRef, matterTypeConfig, selectedClauses } = body;

    if (!form || !agency) {
      return NextResponse.json({ error: 'form and agency are required' }, { status: 400 });
    }

    const normalizedForm = {
      ...form,
      feeItems: normalizeFeeItemsFromForm(form),
    };

    const html = buildAgreementPreviewHtml({
      form: normalizedForm,
      agency,
      rma: rma || null,
      agreementRef: agreementRef || 'DRAFT',
      matterTypeConfig: matterTypeConfig || null,
      selectedClauses: selectedClauses || [],
    });

    const pdfBuffer = await PDFService.generatePdf(html);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="agreement-preview.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PDF preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
