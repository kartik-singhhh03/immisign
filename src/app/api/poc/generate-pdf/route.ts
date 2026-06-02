import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { DocumentGenerationService } from '@/features/agreements/services/document-generation.service';
import { stripSensitiveUrlParams } from '@/lib/security/sanitize';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
    // Use service role if available to bypass RLS for POC
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read only */ },
      },
    });

    const docService = new DocumentGenerationService(supabase);
    
    // To properly test this, we generate fake UUIDs
    const agencyId = crypto.randomUUID();
    const userId = crypto.randomUUID(); // Note: Will fail FK if not in auth.users, handled below
    const clientId = crypto.randomUUID();
    const templateId = crypto.randomUUID();
    const agreementId = crypto.randomUUID();

    // Seed mock data for POC (may fail if strict FK are enforced on auth.users without a real user)
    await supabase.from('agencies').insert({ id: agencyId, name: 'POC Agency', slug: `poc-${Date.now()}` } as any);
    
    // Optional: insert user if possible
    try {
      await supabase.from('users').insert({ id: userId, agency_id: agencyId, full_name: 'POC User', email: `poc${Date.now()}@test.com`, role: 'owner' } as any);
    } catch (e) {}

    await supabase.from('clients').insert({ id: clientId, agency_id: agencyId, first_name: 'John', last_name: 'Doe', email: 'john@email.com' } as any);
    await (supabase.from('templates' as any) as any).insert({ id: templateId, agency_id: agencyId, name: 'POC Template', content: { html: "<h1>Agreement for {{client_name}}</h1><p>Fee: {{fee_amount}}</p>" } });
    await supabase.from('agreements').insert({
      id: agreementId,
      agency_id: agencyId,
      created_by: userId,
      title: 'POC Agreement',
      agreement_number: `POC-${Date.now()}`,
      status: 'draft' as any,
      client_id: clientId,
      template_id: templateId,
    } as any);

    // Generate Document
    const result = await docService.generateDocument(agencyId, userId, agreementId);
    
    // Verify retrieval
    const { data: fileData, error: fileError } = await supabase.storage.from('secure_documents').createSignedUrl(result.storagePath, 60);

    return NextResponse.json({
      success: true,
      metrics: {
        generationTimeMs: result.timeMs,
        fileSizeBytes: result.size,
        storageSuccess: !fileError,
        storagePath: result.storagePath,
        retrievalUrl: fileData?.signedUrl ? stripSensitiveUrlParams(fileData.signedUrl) : null
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

