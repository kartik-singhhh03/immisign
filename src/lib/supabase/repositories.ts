import { SupabaseClient } from '@supabase/supabase-js';
import { StorageService, StorageHelpers } from './storage';

export class DashboardRepository {
  constructor(private supabase: SupabaseClient) {}

  async getMetrics(agencyId: string) {
    const [{ count: clientsCount }, { count: agreementsCount, data: agreementsData }, { count: approvalsCount }] = await Promise.all([
      this.supabase.from('clients').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
      this.supabase.from('agreements').select('professional_fee', { count: 'exact' }).eq('agency_id', agencyId),
      this.supabase.from('application_approvals').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId)
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

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('clients')
      .select('id, agency_id, name, email, phone, created_at, updated_at, agreements(id, status, payment_schedules(total_amount, currency))')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(c => ({
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
    }));
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
    const { data, error } = await this.supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: { name?: string; email?: string; phone?: string }, agencyId?: string) {
    let query = this.supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('agreements')
      .select('*, clients(name, email), matter_types(name)')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map(a => ({
      id: a.agreement_number || a.id,
      real_id: a.id,
      client: a.clients?.name || a.client_name,
      email: a.clients?.email || a.client_email,
      matter: a.matter_types?.name || 'Standard Matter',
      fee: '$' + (a.professional_fee || 3500).toLocaleString(),
      status: a.status === 'pending' ? 'Sent' : a.status === 'signed' ? 'Signed' : 'Draft',
      date: new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      scope: 'Professional services representation',
      law: 'New South Wales (NSW)'
    }));
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

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('application_approvals')
      .select('*, clients(name)')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(a => ({
      id: a.id,
      title: a.title,
      client: a.clients?.name || 'Unknown Client',
      type: a.visa_subclass || 'Visa',
      status: a.status === 'pending' ? 'Pending Review' : a.status === 'approved' ? 'Approved' : 'Changes Requested',
      date: new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    }));
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

  async list(agencyId: string) {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    
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
      } else if (secureUrlError) {
        console.error("Error creating secure signed URLs:", secureUrlError);
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
      } else if (regularUrlError) {
        console.error("Error creating documents signed URLs:", regularUrlError);
      }
    }

    const docsWithSignedUrls = data.map(d => {
      const signedUrl = (d.file_url && signedUrlsMap[d.file_url]) ? signedUrlsMap[d.file_url] : d.file_url;
      return {
        id: d.id,
        name: d.file_name,
        category: d.agreement_id ? 'Agreement' : 'Manual Upload',
        size: (d.file_size ? (d.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'),
        type: d.mime_type?.includes('pdf') ? 'PDF' : (d.mime_type?.includes('word') ? 'DOC' : 'FILE'),
        date: new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        downloads: 0,
        file_url: signedUrl,
        agreement_id: d.agreement_id
      };
    });

    return docsWithSignedUrls;
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
