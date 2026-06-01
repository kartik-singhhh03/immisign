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
  ActivityLogsRepository
} from '@/lib/supabase/repositories';


export async function getRealAgencyId(supabase: SupabaseClient, fallback?: string | null) {
  if (!fallback || !fallback.startsWith('w-')) return fallback;
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

export function useClients() {
  const [data, setData] = useState<any[]>([]);
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
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const clients = await repo.list(actId);
      setData(clients);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

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

  return { data, loading, error, refetch: fetch, addClient, updateClient, deleteClient };
}

export function useAgreements() {
  const [data, setData] = useState<any[]>([]);
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
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const agreements = await repo.list(actId);
      setData(agreements);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

  useEffect(() => { fetch() }, [fetch]);

  const addAgreement = async (agreementData: any) => {
    if (!activeWorkspace?.id) return;
    const actId = await getRealAgencyId(supabase, activeWorkspace.id);
    if (!actId) throw new Error('Authenticated agency could not be resolved.');
    const newAgreement = await repo.create({ ...agreementData, agency_id: actId });
    await fetch(); // Refetch after mutation
    return newAgreement;
  };

  return { data, loading, error, refetch: fetch, addAgreement };
}

export function useApprovals() {
  const [data, setData] = useState<any[]>([]);
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
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const approvals = await repo.list(actId);
      setData(approvals);
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

export function useDocuments() {
  const [data, setData] = useState<any[]>([]);
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
        setError(new Error('Authenticated agency could not be resolved.'));
        return;
      }
      const docs = await repo.list(actId);
      setData(docs);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, repo, supabase]);

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

  return { data, loading, error, refetch: fetch, addDocument };
}
