import { 
  ApplicationApproval, 
  ApprovalStatus, 
  IApprovalRepository 
} from '@/types/approval';

// Using a simple in-memory simulation backed by localStorage for real persistence across refreshes
const STORAGE_KEY = 'immisign_mock_approvals';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockApprovalRepository implements IApprovalRepository {
  private getStore(): ApplicationApproval[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStore(data: ApplicationApproval[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async getById(id: string): Promise<ApplicationApproval | null> {
    await delay(200);
    const store = this.getStore();
    return store.find(a => a.id === id) || null;
  }

  async listByAgency(agencyId: string): Promise<ApplicationApproval[]> {
    await delay(300);
    const store = this.getStore();
    return store.filter(a => a.agency_id === agencyId);
  }

  async create(approval: Partial<ApplicationApproval>): Promise<ApplicationApproval> {
    await delay(400);
    const store = this.getStore();
    
    const newApproval: ApplicationApproval = {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      agency_id: approval.agency_id || 'mock-agency',
      client_id: approval.client_id || 'mock-client',
      title: approval.title || 'Untitled Application',
      description: approval.description,
      status: approval.status || 'draft',
      checklist: approval.checklist || [],
      declarations: approval.declarations || [],
      created_by: approval.created_by || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...approval
    } as ApplicationApproval;

    store.push(newApproval);
    this.saveStore(store);
    return newApproval;
  }

  async update(id: string, updates: Partial<ApplicationApproval>): Promise<ApplicationApproval> {
    await delay(300);
    const store = this.getStore();
    const idx = store.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Approval not found');

    const updated = {
      ...store[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    store[idx] = updated;
    this.saveStore(store);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await delay(200);
    const store = this.getStore();
    this.saveStore(store.filter(a => a.id !== id));
  }

  async updateStatus(id: string, status: ApprovalStatus): Promise<ApplicationApproval> {
    return this.update(id, { status });
  }
}

export const approvalRepository = new MockApprovalRepository();
