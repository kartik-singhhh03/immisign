import { SupabaseClient } from '@supabase/supabase-js';
import { filterProductionClients } from '@/lib/data/production-filters';
import { StorageService, StorageHelpers } from './storage';

export class DashboardRepository {
  constructor(private supabase: SupabaseClient) {}

  async getMetrics(agencyId: string) {
    const [{ count: clientsCount }, { count: agreementsCount, data: agreementsData }, { count: approvalsCount }] = await Promise.all([
      this.supabase.from('clients').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
      this.supabase.from('agreements').select('professional_fee', { count: 'exact' }).eq('agency_id', agencyId),
      this.supabase.from('application_approvals').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId).is('deleted_at', null).in('status', ['submitted', 'under_review', 'changes_requested'])
    ]);

    const totalRevenue = (agreementsData || []).reduce((sum, a) => sum + (Number(a.professional_fee) || 0), 0);
    const formattedRevenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue);

    return {
      activeClients: clientsCount || 0,
      activeAgreements: agreementsCount || 0,
      pendingApprovals: approvalsCount || 0,
      monthlyRevenue: formattedRevenue
    };
  }

  async getRecentActivity(agencyId: string) {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    // Map to the expected UI format
    return data.map(log => {
      // Calculate 'time ago' string
      const date = new Date(log.created_at);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);
      let timeStr = 'Just now';
      if (diffDays > 0) timeStr = `${diffDays}d ago`;
      else if (diffHrs > 0) timeStr = `${diffHrs}h ago`;
      else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins > 0) timeStr = `${diffMins}m ago`;
      }
      
      return {
        id: log.id,
        title: log.title,
        description: log.description || '',
        time: timeStr,
        type: log.type
      };
    });
  }
}

export class ActivityLogsRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(params: {
    agency_id: string;
    user_id: string;
    type: string;
    title: string;
    description?: string;
    reference_id?: string;
    reference_type?: string;
  }) {
    const { error } = await this.supabase
      .from('activity_logs')
      .insert({
        id: crypto.randomUUID(),
        agency_id: params.agency_id,
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        description: params.description || null,
        reference_id: params.reference_id || null,
        reference_type: params.reference_type || null,
      });
    // Silently swallow errors — activity logging must never block business operations
    if (error) {
      console.warn('Activity log insert warning:', error.message);
    }
  }
}

export class ClientsRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('clients')
      .select('id, agency_id, name, email, phone, created_at, updated_at, agreements(id, status, payment_schedules(total_amount, currency))', { count: 'exact' })
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const filtered = filterProductionClients(data || []);

    return {
      data: filtered.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        matters: Array.isArray((c as any).agreements) ? (c as any).agreements.length : 0,
        stage: Array.isArray((c as any).agreements) && (c as any).agreements.some((a: any) => ['pending', 'sent', 'viewed'].includes(a.status))
          ? 'In progress'
          : 'Active',
        value: this.formatAgreementValue((c as any).agreements || []),
        created_at: c.created_at,
        updated_at: c.updated_at
      })),
      count: count || 0
    };
  }

  private formatAgreementValue(agreements: any[]) {
    const total = agreements.reduce((sum, agreement) => {
      const schedules = Array.isArray(agreement.payment_schedules) ? agreement.payment_schedules : [];
      return sum + schedules.reduce((innerSum: number, schedule: any) => {
        return innerSum + Number(schedule.total_amount || 0);
      }, 0);
    }, 0);

    if (!total) return '$0';

    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(total);
  }

  async getById(id: string, agencyId?: string) {
    let query = this.supabase
      .from('clients')
      .select('*')
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  }

  async create(client: any) {
    const { parseOrThrow } = await import('@/lib/validations/fields');
    const { clientCreateSchema } = await import('@/lib/validations/schemas');
    const parsed = parseOrThrow(clientCreateSchema, client);
    if (!client.agency_id) throw new Error('agency_id is required');
    const { data, error } = await this.supabase
      .from('clients')
      .insert({
        agency_id: client.agency_id,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: { name?: string; email?: string; phone?: string }, agencyId?: string) {
    const { parseOrThrow } = await import('@/lib/validations/fields');
    const { clientUpdateSchema } = await import('@/lib/validations/schemas');
    const parsed = parseOrThrow(clientUpdateSchema, updates);
    let query = this.supabase
      .from('clients')
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async delete(id: string, agencyId?: string) {
    let query = this.supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  }
}

export class AgreementsRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('agreements')
      .select('*, clients!inner(name, email), matter_types(name)', { count: 'exact' })
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (search) {
      query = query.or(`clients.name.ilike.%${search}%,clients.email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      data: data.map(a => ({
        id: a.id,
        ref: a.agreement_number || a.id,
        real_id: a.id,
        client: a.clients?.name || a.client_name,
        email: a.clients?.email || a.client_email,
        matter: a.matter_types?.name || 'Standard Matter',
        fee: '$' + (a.professional_fee || 3500).toLocaleString(),
        status: a.status === 'pending' ? 'Sent' : a.status === 'signed' ? 'Signed' : 'Draft',
        date: new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        scope: 'Professional services representation',
        law: 'New South Wales (NSW)'
      })),
      count: count || 0
    };
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('agreements')
      .select('*, clients(name, email), matter_types(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async create(agreement: any) {
    const { data, error } = await this.supabase
      .from('agreements')
      .insert(agreement)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export class ApprovalsRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('application_approvals')
      .select('*, clients!inner(name)', { count: 'exact' })
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,clients.name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      data: data.map(a => ({
        id: a.id,
        title: a.title,
        client: a.clients?.name || 'Unknown Client',
        type: a.visa_subclass || 'Visa',
        status: a.status,
        approval_number: a.approval_number,
        date: new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      })),
      count: count || 0
    };
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .select('*, clients(name, email)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
}

export class DocumentsRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.ilike('file_name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Separate paths by bucket based on agreement_id
    const securePaths: string[] = [];
    const regularPaths: string[] = [];

    data.forEach(d => {
      if (d.file_url) {
        if (d.agreement_id) {
          securePaths.push(d.file_url);
        } else {
          regularPaths.push(d.file_url);
        }
      }
    });

    const signedUrlsMap: Record<string, string> = {};

    // 1. Get signed URLs from secure_documents bucket
    if (securePaths.length > 0) {
      const { data: secureUrlData, error: secureUrlError } = await this.supabase.storage
        .from('secure_documents')
        .createSignedUrls(securePaths, 3600);
        
      if (!secureUrlError && secureUrlData) {
        secureUrlData.forEach((u: any) => {
          if (u.path && u.signedUrl) {
            signedUrlsMap[u.path] = u.signedUrl;
          }
        });
      }
    }

    // 2. Get signed URLs from documents bucket
    if (regularPaths.length > 0) {
      const { data: regularUrlData, error: regularUrlError } = await this.supabase.storage
        .from('documents')
        .createSignedUrls(regularPaths, 3600);
        
      if (!regularUrlError && regularUrlData) {
        regularUrlData.forEach((u: any) => {
          if (u.path && u.signedUrl) {
            signedUrlsMap[u.path] = u.signedUrl;
          }
        });
      }
    }

    const docsWithSignedUrls = data.map(d => {
      const signedUrl = (d.file_url && signedUrlsMap[d.file_url]) ? signedUrlsMap[d.file_url] : d.file_url;
      const mime = d.mime_type || '';
      return {
        id: d.id,
        name: d.file_name,
        category: d.agreement_id ? 'Agreement' : 'Manual Upload',
        size: d.file_size != null ? `${(d.file_size / 1024 / 1024).toFixed(2)} MB` : '—',
        type: mime.includes('pdf') ? 'PDF' : mime.includes('word') ? 'DOC' : mime.split('/').pop()?.toUpperCase() || 'FILE',
        date: d.created_at
          ? new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
        created_at: d.created_at,
        mime_type: mime,
        signwell_status: d.signwell_status || null,
        signwell_document_id: d.signwell_document_id || null,
        uploaded_by: d.uploaded_by,
        file_url: signedUrl,
        agreement_id: d.agreement_id,
        storage_bucket: d.agreement_id ? 'secure_documents' : 'documents',
      };
    });

    return { data: docsWithSignedUrls, count: count || 0 };
  }

  async create(document: { file: File; agency_id: string; uploaded_by: string; agreement_id?: string; }) {
    const storageService = new StorageService(this.supabase);
    const documentId = crypto.randomUUID();
    const filePath = StorageHelpers.getDocumentPath(document.agency_id, documentId, document.file.name);
    
    // Upload to Storage
    const bucket = document.agreement_id ? 'secure_documents' : 'documents';
    const uploadedPath = await storageService.uploadFile(bucket, filePath, document.file);

    // Record in DB
    const { data, error } = await this.supabase
      .from('documents')
      .insert({
        id: documentId,
        agency_id: document.agency_id,
        agreement_id: document.agreement_id || null,
        uploaded_by: document.uploaded_by,
        file_name: document.file.name,
        original_name: document.file.name,
        file_size: document.file.size,
        mime_type: document.file.type,
        file_url: uploadedPath // Store internal path, NOT signed URL
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export class TeamRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  async updateRole(userId: string, role: string) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateStatus(userId: string, is_active: boolean) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(userId: string) {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', userId);
    if (error) throw error;
    return true;
  }
}

export class InvitationsRepository {
  constructor(private supabase: SupabaseClient) {}

  async listPending(agencyId: string) {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('agency_id', agencyId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async cancel(inviteId: string) {
    const { error } = await this.supabase
      .from('invitations')
      .delete()
      .eq('id', inviteId);
    if (error) throw error;
    return true;
  }
}

export class AgencyRepository {
  constructor(private supabase: SupabaseClient) {}

  async updateProfile(agencyId: string, updates: any) {
    const { parseOrThrow } = await import('@/lib/validations/fields');
    const { agencyProfileUpdateSchema } = await import('@/lib/validations/schemas');
    const parsed = parseOrThrow(agencyProfileUpdateSchema, updates);
    const { data, error } = await this.supabase
      .from('agencies')
      .update({
        ...parsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agencyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export class BrandingRepository {
  constructor(private supabase: SupabaseClient) {}

  async updateBranding(agencyId: string, updates: Record<string, unknown>) {
    const payload: Record<string, unknown> = {
      agency_id: agencyId,
      updated_at: new Date().toISOString(),
    };
    for (const key of [
      'primary_color',
      'secondary_color',
      'logo_url',
      'email_footer',
      'font_family',
      'agreement_ref_prefix',
      'agreement_ref_start',
      'agreement_header_title',
      'agreement_footer_text',
    ] as const) {
      if (key in updates) payload[key] = updates[key];
    }
    const { data, error } = await this.supabase
      .from('branding_settings')
      .upsert(payload, { onConflict: 'agency_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getBranding(agencyId: string) {
    const { data, error } = await this.supabase
      .from('branding_settings')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

export class MatterDefaultsRepository {
  constructor(private supabase: SupabaseClient) {}

  async updateDefaults(agencyId: string, updates: any) {
    const { data, error } = await this.supabase
      .from('matter_defaults')
      .upsert({
        agency_id: agencyId,
        default_professional_fee: updates.default_professional_fee,
        default_payment_terms: updates.default_payment_terms,
        default_scope_of_services: updates.default_scope_of_services,
        default_special_terms: updates.default_special_terms,
        default_payment_schedule: updates.default_payment_schedule,
        updated_at: new Date().toISOString()
      }, { onConflict: 'agency_id' })
      .select()
      .single();
    
    if (error) {
       console.warn("Matter defaults upsert failed:", error.message);
       return null;
    }
    return data;
  }

  async getDefaults(agencyId: string) {
    const { data, error } = await this.supabase
      .from('matter_defaults')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (error) {
      console.warn('Matter defaults fetch failed:', error.message);
      return null;
    }
    return data;
  }
}

export class ClausesRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('agreement_clauses')
      .select('*')
      .eq('agency_id', agencyId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data;
  }

  async create(agencyId: string, clause: any) {
    const { data, error } = await this.supabase
      .from('agreement_clauses')
      .insert({
        agency_id: agencyId,
        title: clause.title,
        content: clause.content,
        is_mandatory: clause.is_mandatory || false,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(clauseId: string) {
    const { error } = await this.supabase
      .from('agreement_clauses')
      .delete()
      .eq('id', clauseId);
    if (error) throw error;
    return true;
  }
}

export class MatterTypesRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('matter_types')
      .select('*')
      .eq('agency_id', agencyId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async create(agencyId: string, name: string) {
    const { data: existing } = await this.supabase
      .from('matter_types')
      .select('sort_order')
      .eq('agency_id', agencyId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
    const { data, error } = await this.supabase
      .from('matter_types')
      .insert({ agency_id: agencyId, name: name.trim(), sort_order: nextOrder })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateName(id: string, name: string) {
    const { data, error } = await this.supabase
      .from('matter_types')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('matter_types').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async listFields(matterTypeId: string) {
    const { data, error } = await this.supabase
      .from('matter_type_fields')
      .select('*')
      .eq('matter_type_id', matterTypeId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createField(matterTypeId: string, field: {
    field_key: string;
    label: string;
    field_type?: string;
    required?: boolean;
    placeholder?: string;
    col_span?: number;
  }) {
    const { data: existing } = await this.supabase
      .from('matter_type_fields')
      .select('sort_order')
      .eq('matter_type_id', matterTypeId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
    const { data, error } = await this.supabase
      .from('matter_type_fields')
      .insert({
        matter_type_id: matterTypeId,
        field_key: field.field_key,
        label: field.label,
        field_type: field.field_type || 'text',
        required: Boolean(field.required),
        placeholder: field.placeholder || null,
        col_span: field.col_span === 2 ? 2 : 1,
        sort_order: nextOrder,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteField(fieldId: string) {
    const { error } = await this.supabase.from('matter_type_fields').delete().eq('id', fieldId);
    if (error) throw error;
    return true;
  }

  async updateMatterTypeFlags(id: string, flags: {
    subclass_placeholder?: string;
    show_secondary_applicant?: boolean;
    show_sponsor?: boolean;
    show_dependants?: boolean;
  }) {
    const { data, error } = await this.supabase
      .from('matter_types')
      .update({ ...flags, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export class AgencyPaymentSchedulesRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('agency_payment_schedules')
      .select('*')
      .eq('agency_id', agencyId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async create(agencyId: string, label: string) {
    const { data: existing } = await this.supabase
      .from('agency_payment_schedules')
      .select('sort_order')
      .eq('agency_id', agencyId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
    const { data, error } = await this.supabase
      .from('agency_payment_schedules')
      .insert({ agency_id: agencyId, label: label.trim(), sort_order: nextOrder })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase.from('agency_payment_schedules').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}

export class RmaTeamRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('rmas')
      .select('*, users(full_name, email, phone, is_active)')
      .eq('agency_id', agencyId)
      .order('is_default', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async upsertForUser(agencyId: string, payload: {
    user_id: string;
    mara_number: string;
    phone?: string;
    is_default?: boolean;
    rma_status?: string;
    rma_tier?: string;
  }) {
    const { parseOrThrow } = await import('@/lib/validations/fields');
    const { rmaUpsertSchema } = await import('@/lib/validations/schemas');
    const parsed = parseOrThrow(rmaUpsertSchema, {
      user_id: payload.user_id,
      mara_number: payload.mara_number,
      phone: payload.phone,
      rma_tier: payload.rma_tier,
    });
    const { data: existing } = await this.supabase
      .from('rmas')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('user_id', payload.user_id)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await this.supabase
        .from('rmas')
        .update({
          mara_number: parsed.mara_number,
          phone: parsed.phone ?? null,
          is_default: payload.is_default ?? false,
          rma_status: payload.rma_status || 'active',
          rma_tier: payload.rma_tier || 'associate',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await this.supabase
      .from('rmas')
      .insert({
        agency_id: agencyId,
        user_id: parsed.user_id,
        mara_number: parsed.mara_number,
        phone: parsed.phone ?? null,
        is_default: payload.is_default ?? false,
        rma_status: payload.rma_status || 'active',
        rma_tier: payload.rma_tier || 'associate',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async setDefault(agencyId: string, rmaId: string) {
    await this.supabase.from('rmas').update({ is_default: false }).eq('agency_id', agencyId);
    const { error } = await this.supabase.from('rmas').update({ is_default: true }).eq('id', rmaId);
    if (error) throw error;
    return true;
  }

  async setStatus(rmaId: string, status: string) {
    const { error } = await this.supabase.from('rmas').update({ rma_status: status }).eq('id', rmaId);
    if (error) throw error;
    return true;
  }

  async remove(rmaId: string) {
    const { error } = await this.supabase.from('rmas').delete().eq('id', rmaId);
    if (error) throw error;
    return true;
  }
}
