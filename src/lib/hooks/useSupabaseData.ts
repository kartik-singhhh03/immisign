"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { 
  DashboardRepository, 
  ClientsRepository, 
  AgreementsRepository, 
  ApprovalsRepository,
  DocumentsRepository,
  ActivityLogsRepository,
  TeamRepository
} from '@/lib/supabase/repositories';


export async function getRealAgencyId(supabase: SupabaseClient, agencyId?: string | null) {
  if (agencyId && /^[0-9a-f-]{36}$/i.test(agencyId)) return agencyId;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('agency_id').eq('id', user.id).single();
  return data?.agency_id || null;
}

export function useDashboardMetrics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new DashboardRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const agencyId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!agencyId) {
        setData(null);
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const [metrics, activity] = await Promise.all([
        repo.getMetrics(agencyId),
        repo.getRecentActivity(agencyId)
      ]);
      setData({ metrics, activity });
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  useEffect(() => { fetch() }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useClients(initialOptions: { page?: number; limit?: number; search?: string } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new ClientsRepository(supabase), [supabase]);
  const activityRepo = useMemo(() => new ActivityLogsRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) {
        setData([]);
        setCount(0);
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const result = await repo.list(actId, options);
      setData(result.data);
      setCount(result.count);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase, options.page, options.limit, options.search]);

  useEffect(() => { fetch() }, [fetch]);

  const addClient = async (clientData: any) => {
    if (!activeWorkspace?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) throw new Error('Authenticated agency could not be resolved.');
    const newClient = await repo.create({ ...clientData, agency_id: actId });
    if (user) {
      await activityRepo.create({
        agency_id: actId,
        user_id: user.id,
        type: 'client',
        title: 'Client Created',
        description: `Registered profile for ${clientData.name}`,
        reference_id: newClient.id,
        reference_type: 'client'
      });
    }
    await fetch();
    return newClient;
  };

  const updateClient = async (id: string, updates: { name?: string; email?: string; phone?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const actId = activeWorkspace?.id ? await getRealAgencyId(supabase, activeWorkspace.id) : null;
    if (!actId) throw new Error('Authenticated agency could not be resolved.');
    const updated = await repo.update(id, updates, actId);
    if (user && activeWorkspace?.id) {
      await activityRepo.create({
        agency_id: actId,
        user_id: user.id,
        type: 'client',
        title: 'Client Updated',
        description: `Profile updated for ${updates.name || id}`,
        reference_id: id,
        reference_type: 'client'
      });
    }
    await fetch();
    return updated;
  };

  const deleteClient = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const actId = activeWorkspace?.id ? await getRealAgencyId(supabase, activeWorkspace.id) : null;
    if (!actId) throw new Error('Authenticated agency could not be resolved.');
    await repo.delete(id, actId);
    if (user && activeWorkspace?.id) {
      await activityRepo.create({
        agency_id: actId,
        user_id: user.id,
        type: 'client',
        title: 'Client Deleted',
        description: `Client record permanently removed`,
        reference_id: id,
        reference_type: 'client'
      });
    }
    await fetch();
  };

  return { data, count, options, setOptions, loading, error, refetch: fetch, addClient, updateClient, deleteClient };
}

export function useAgreements(initialOptions: { page?: number; limit?: number; search?: string } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new AgreementsRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) {
        setData([]);
        setCount(0);
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const result = await repo.list(actId, options);
      setData(result.data);
      setCount(result.count);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase, options.page, options.limit, options.search]);

  useEffect(() => { fetch() }, [fetch]);

  const addAgreement = async (agreementData: any) => {
    if (!activeWorkspace?.id) return;
    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) throw new Error('Authenticated agency could not be resolved.');
    const newAgreement = await repo.create({ ...agreementData, agency_id: actId });
    await fetch(); // Refetch after mutation
    return newAgreement;
  };

  return { data, count, options, setOptions, loading, error, refetch: fetch, addAgreement };
}

export function useApprovals(initialOptions: { page?: number; limit?: number; search?: string } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new ApprovalsRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) {
        setData([]);
        setCount(0);
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const result = await repo.list(actId, options);
      setData(result.data);
      setCount(result.count);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase, options.page, options.limit, options.search]);

  useEffect(() => { fetch() }, [fetch]);

  return { data, count, options, setOptions, loading, error, refetch: fetch };
}

export function useDocuments(initialOptions: { page?: number; limit?: number; search?: string } = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new DocumentsRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) {
        setData([]);
        setCount(0);
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const result = await repo.list(actId, options);
      setData(result.data);
      setCount(result.count);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase, options.page, options.limit, options.search]);

  useEffect(() => { fetch() }, [fetch]);

  const addDocument = async (documentData: { file: File, agreement_id?: string }) => {
    if (!activeWorkspace?.id) return;
    
    // Get actual DB user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be authenticated to upload documents.");

    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) throw new Error('Authenticated agency could not be resolved.');

    const newDoc = await repo.create({ 
      ...documentData, 
      agency_id: actId,
      uploaded_by: user.id
    });
    
    await fetch();
    return newDoc;
  };

  return { data, count, options, setOptions, loading, error, refetch: fetch, addDocument };
}

export function useTeamMembers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new TeamRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) {
        setData([]);
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const members = await repo.list(actId);
      setData(members);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  useEffect(() => { fetch() }, [fetch]);

  const updateRole = async (userId: string, role: string) => {
    await repo.updateRole(userId, role);
    await fetch();
  };

  const updateStatus = async (userId: string, is_active: boolean) => {
    await repo.updateStatus(userId, is_active);
    await fetch();
  };

  const removeMember = async (userId: string) => {
    await repo.delete(userId);
    await fetch();
  };

  return { data, loading, error, refetch: fetch, updateRole, updateStatus, removeMember };
}

import { InvitationsRepository, AgencyRepository, BrandingRepository, MatterDefaultsRepository, ClausesRepository, MatterTypesRepository, AgencyPaymentSchedulesRepository, RmaTeamRepository } from '../supabase/repositories';

export function useInvitations() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new InvitationsRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) return setLoading(false);
    try {
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (actId) setData(await repo.listPending(actId));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  const cancelInvite = async (id: string) => {
    await repo.cancel(id);
    await fetch();
  };

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch, cancelInvite };
}

export function useAgencyProfile() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new AgencyRepository(supabase), [supabase]);
  const brandingRepo = useMemo(() => new BrandingRepository(supabase), [supabase]);
  const defaultsRepo = useMemo(() => new MatterDefaultsRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) return setLoading(false);
    try {
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (actId) {
        // Fetch agency core
        const { data: agency } = await supabase.from('agencies').select('*').eq('id', actId).single();
        const branding = await brandingRepo.getBranding(actId);
        const defaults = await defaultsRepo.getDefaults(actId);
        
        setData({
           ...agency,
           branding: branding || {},
           defaults: defaults || {}
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, brandingRepo, defaultsRepo, supabase]);

  const updateProfile = async (updates: any) => {
    if (!activeWorkspace?.id) return;
    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) return;
    await repo.updateProfile(actId, updates);
    await fetch();
  };

  const updateBranding = async (updates: any) => {
    if (!activeWorkspace?.id) return;
    const res = await fetch('/api/settings/branding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to save branding settings');
    }
    await fetch();
  };

  const updateDefaults = async (updates: any) => {
    if (!activeWorkspace?.id) return;
    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) return;
    await defaultsRepo.updateDefaults(actId, updates);
    await fetch();
  };

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch, updateProfile, updateBranding, updateDefaults };
}

export function useClauses() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new ClausesRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) return setLoading(false);
    try {
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (actId) setData(await repo.list(actId));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  const addClause = async (clause: any) => {
    if (!activeWorkspace?.id) return;
    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) return;
    await repo.create(actId, clause);
    await fetch();
  };

  const deleteClause = async (id: string) => {
    await repo.delete(id);
    await fetch();
  };

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch, addClause, deleteClause };
}

export function useMatterTypesSettings() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new MatterTypesRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) return setLoading(false);
    try {
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (actId) setData(await repo.list(actId));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  const addMatterType = async (name: string) => {
    const actId = await getRealAgencyId(supabase, activeWorkspace?.id);
    if (!actId) return;
    await repo.create(actId, name);
    await fetch();
  };

  const deleteMatterType = async (id: string) => {
    await repo.delete(id);
    await fetch();
  };

  const loadMatterTypeFields = async (matterTypeId: string) => repo.listFields(matterTypeId);

  const addMatterTypeField = async (
    matterTypeId: string,
    field: { field_key: string; label: string; field_type?: string; required?: boolean }
  ) => {
    await repo.createField(matterTypeId, field);
  };

  const deleteMatterTypeField = async (fieldId: string) => {
    await repo.deleteField(fieldId);
  };

  useEffect(() => { fetch() }, [fetch]);
  return {
    data,
    loading,
    refetch: fetch,
    addMatterType,
    deleteMatterType,
    loadMatterTypeFields,
    addMatterTypeField,
    deleteMatterTypeField,
  };
}

export function usePaymentScheduleSettings() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new AgencyPaymentSchedulesRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) return setLoading(false);
    try {
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (actId) setData(await repo.list(actId));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  const addSchedule = async (label: string) => {
    const actId = await getRealAgencyId(supabase, activeWorkspace?.id);
    if (!actId) return;
    await repo.create(actId, label);
    await fetch();
  };

  const deleteSchedule = async (id: string) => {
    await repo.delete(id);
    await fetch();
  };

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch, addSchedule, deleteSchedule };
}

export function useRmaTeam() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);
  const repo = useMemo(() => new RmaTeamRepository(supabase), [supabase]);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) return setLoading(false);
    try {
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (actId) setData(await repo.list(actId));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  const setDefault = async (rmaId: string) => {
    const actId = await getRealAgencyId(supabase, activeWorkspace?.id);
    if (!actId) return;
    await repo.setDefault(actId, rmaId);
    await fetch();
  };

  const setStatus = async (rmaId: string, status: string) => {
    await repo.setStatus(rmaId, status);
    await fetch();
  };

  const removeRma = async (rmaId: string) => {
    await repo.remove(rmaId);
    await fetch();
  };

  const upsertRma = async (payload: Parameters<RmaTeamRepository['upsertForUser']>[1]) => {
    const actId = await getRealAgencyId(supabase, activeWorkspace?.id);
    if (!actId) return;
    await repo.upsertForUser(actId, payload);
    await fetch();
  };

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch, setDefault, setStatus, removeRma, upsertRma };
}

export function useUserProfile() {
  const { user } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  const updateProfile = async (updates: { full_name?: string; phone?: string }) => {
    if (!user) return;
    const { parseOrThrow } = await import('@/lib/validations/fields');
    const { userProfileUpdateSchema } = await import('@/lib/validations/schemas');
    const parsed = parseOrThrow(userProfileUpdateSchema, updates);
    setLoading(true);
    const { error } = await supabase.from('users').update(parsed).eq('id', user.id);
    setLoading(false);
    if (error) throw error;
  };

  const toggleMfa = async (enabled: boolean) => {
    if (!user) return;
    setLoading(true);
    await supabase.from('users').update({ mfa_enabled: enabled }).eq('id', user.id);
    setLoading(false);
  };

  return { updateProfile, toggleMfa, loading };
}

export function usePendingSignatures() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) return;

      const { data: records } = await supabase
        .from('agreements')
        .select('*, clients!inner(name, email)')
        .eq('agency_id', actId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(5);
      
      setData(records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, supabase]);

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useTeamActivity() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const supabase = useMemo(() => createClient(), []);

  const fetch = useCallback(async () => {
    if (!activeWorkspace?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const actId = await getRealAgencyId(supabase, activeWorkspace.id);
      if (!actId) return;

      const { data: records } = await supabase
        .from('activity_logs')
        .select('*, users!left(full_name)')
        .eq('agency_id', actId)
        .neq('type', 'client') // Team activity is generally non-client or all
        .order('created_at', { ascending: false })
        .limit(10);
      
      setData(records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, supabase]);

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useClientTimeline(clientId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetch = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      setLoading(true);
      
      const timeline: any[] = [];
      
      // 1. Client Created
      const { data: client } = await supabase.from('clients').select('created_at').eq('id', clientId).single();
      if (client?.created_at) {
        timeline.push({ type: 'created', title: 'Client Profile Created', date: new Date(client.created_at) });
      }

      // 2. Agreements
      const { data: agreements } = await supabase.from('agreements').select('created_at, sent_at, completed_at, status, title').eq('client_id', clientId);
      if (agreements) {
        agreements.forEach(ag => {
          if (ag.created_at) timeline.push({ type: 'agreement_draft', title: `Drafted: ${ag.title}`, date: new Date(ag.created_at) });
          if (ag.sent_at) timeline.push({ type: 'agreement_sent', title: `Sent for Signature: ${ag.title}`, date: new Date(ag.sent_at) });
          if (ag.status === 'viewed') timeline.push({ type: 'agreement_viewed', title: `Client Viewed: ${ag.title}`, date: new Date() }); // approximated if no viewed_at
          if (ag.completed_at || ag.status === 'signed') timeline.push({ type: 'agreement_signed', title: `Signed: ${ag.title}`, date: new Date(ag.completed_at || new Date()) });
        });
      }

      // 3. Approvals (schema: title, visa_subclass, approval_number — not application_type)
      const { data: approvals, error: approvalsErr } = await supabase
        .from('application_approvals')
        .select('created_at, updated_at, status, title, visa_subclass, approval_number')
        .eq('client_id', clientId)
        .is('deleted_at', null);
      if (!approvalsErr && approvals) {
        approvals.forEach((ap) => {
          const label =
            ap.title || ap.approval_number || ap.visa_subclass || 'Application approval';
          if (ap.created_at) {
            timeline.push({
              type: 'approval_submitted',
              title: `Approval submitted: ${label}`,
              date: new Date(ap.created_at),
            });
          }
          if (ap.status === 'approved' && ap.updated_at) {
            timeline.push({
              type: 'approval_approved',
              title: `Approved: ${label}`,
              date: new Date(ap.updated_at),
            });
          }
        });
      }

      // 4. Documents
      // (Skipping complex document join for now, will rely on agreements and approvals as primary milestones)

      // Sort descending
      timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setData(timeline);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => { fetch() }, [fetch]);
  return { data, loading, refetch: fetch };
}
