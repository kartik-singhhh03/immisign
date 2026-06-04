import { NextRequest, NextResponse } from 'next/server';
import { signwellTestMode } from '@/lib/signwell/test-mode';

/**
 * Local/debug only — raw SignWell create + send. Set ALLOW_SIGNWELL_DEBUG=true.
 * POST { signerEmail, signerName?, fileUrl? }
 */
export async function POST(req: NextRequest) {
  if (process.env.ALLOW_SIGNWELL_DEBUG !== 'true') {
    return NextResponse.json({ error: 'Disabled. Set ALLOW_SIGNWELL_DEBUG=true locally.' }, { status: 404 });
  }

  const apiKey = process.env.SIGNWELL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'SIGNWELL_API_KEY missing' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const signerEmail = String(body.signerEmail || '').trim();
  if (!signerEmail) {
    return NextResponse.json({ error: 'signerEmail required' }, { status: 400 });
  }

  const fileUrl =
    body.fileUrl ||
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const testMode = signwellTestMode();
  const base = 'https://www.signwell.com/api/v1';
  const headers = { 'Content-Type': 'application/json', 'X-Api-Key': apiKey };

  const createPayload = {
    test_mode: testMode,
    draft: true,
    name: 'debug-signwell-send-test',
    subject: body.subject || 'ImmiSign debug — please sign',
    message: body.message || 'Debug send test from /api/debug/signwell-send-test',
    files: [{ name: 'test.pdf', file_url: fileUrl }],
    recipients: [
      {
        id: 'signer_1',
        name: body.signerName || 'Debug Signer',
        email: signerEmail,
        routing_order: 1,
      },
    ],
    with_signature_page: true,
  };

  const createRes = await fetch(`${base}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload),
  });
  const createText = await createRes.text();
  let created: Record<string, unknown>;
  try {
    created = JSON.parse(createText);
  } catch {
    return NextResponse.json(
      { step: 'create', status: createRes.status, raw: createText },
      { status: 502 },
    );
  }

  if (!createRes.ok || !(created as { id?: string }).id) {
    return NextResponse.json(
      { step: 'create', status: createRes.status, body: created },
      { status: createRes.status },
    );
  }

  const docId = (created as { id: string }).id;
  const sendRes = await fetch(`${base}/documents/${docId}/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      subject: createPayload.subject,
      message: createPayload.message,
    }),
  });
  const sendText = await sendRes.text();
  let sent: Record<string, unknown>;
  try {
    sent = JSON.parse(sendText);
  } catch {
    sent = { raw: sendText };
  }

  const recipients = ((sent as { recipients?: unknown[] }).recipients || []) as Array<{
    email?: string;
    status?: string;
    send_email?: boolean;
    signing_url?: string;
  }>;

  return NextResponse.json({
    computedTestMode: testMode,
    nodeEnv: process.env.NODE_ENV,
    signwellTestModeEnv: process.env.SIGNWELL_TEST_MODE ?? '(unset)',
    create: { status: createRes.status, id: docId, documentStatus: (created as { status?: string }).status },
    send: { status: sendRes.status, documentStatus: (sent as { status?: string }).status },
    recipients: recipients.map((r) => ({
      email: r.email,
      status: r.status,
      send_email: r.send_email,
      signing_url: r.signing_url,
    })),
    rawCreate: created,
    rawSend: sent,
    inboxNote: testMode
      ? 'test_mode=true — SignWell will not email real inboxes'
      : 'test_mode=false — check signer inbox if status is Sent and recipient status is sent',
  });
}
