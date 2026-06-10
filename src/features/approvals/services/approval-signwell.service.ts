import type { SupabaseClient } from '@supabase/supabase-js';
import { createAndSendSignwellDocument } from '@/lib/signwell/document-dispatch';
import { buildDocumentSignatureFields } from '@/lib/signwell/signature-fields';
import { signwellTestMode } from '@/lib/signwell/test-mode';
import { countPdfPages } from '@/lib/pdf/page-count';

export class ApprovalSignWellService {
  constructor(private supabase: SupabaseClient) {}

  async sendForClientSignature(
    agencyId: string,
    approval: {
      id: string;
      title: string;
      approval_number?: string | null;
      document_path?: string | null;
      clients?: { name?: string; email?: string } | null;
    },
  ) {
    if (!approval.document_path) {
      throw new Error('Upload an application PDF before sending to the client.');
    }

    const clientEmail = approval.clients?.email;
    const clientName = approval.clients?.name || 'Client';
    if (!clientEmail) {
      throw new Error('Client email is required on the approval record.');
    }

    const { data: signed } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(approval.document_path, 3600);

    if (!signed?.signedUrl) throw new Error('Could not access application document.');

    let lastPage = 1;
    try {
      const pdfRes = await fetch(signed.signedUrl);
      if (pdfRes.ok) {
        const buf = Buffer.from(await pdfRes.arrayBuffer());
        lastPage = countPdfPages(buf);
      }
    } catch {
      /* default page 1 */
    }

    const label = approval.approval_number || approval.title;
    const swResult = await createAndSendSignwellDocument({
      test_mode: signwellTestMode(),
      name: `Application Approval - ${label}`,
      subject: `Please sign your application approval — ${label}`,
      message: `Please review and sign to confirm your application details are correct.`,
      files: [{ name: 'application-approval.pdf', file_url: signed.signedUrl }],
      recipients: [
        {
          id: 'client',
          email: clientEmail,
          name: clientName,
          role: 'signer',
          order: 1,
        },
      ],
      fields: buildDocumentSignatureFields(
        [{ id: 'client', name: clientName, email: clientEmail }],
        { lastPage },
      ),
    });

    return swResult;
  }
}
