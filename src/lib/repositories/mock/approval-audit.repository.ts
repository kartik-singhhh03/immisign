import { 
  ApprovalAuditEvent, 
  IApprovalAuditRepository 
} from '@/types/approval';

const STORAGE_KEY = 'immisign_mock_approval_audit';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockApprovalAuditRepository implements IApprovalAuditRepository {
  private getStore(): ApprovalAuditEvent[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStore(data: ApprovalAuditEvent[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async listByApplication(applicationId: string): Promise<ApprovalAuditEvent[]> {
    await delay(150);
    const store = this.getStore();
    return store.filter(e => e.applicationId === applicationId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async log(event: Omit<ApprovalAuditEvent, 'id' | 'createdAt'>): Promise<ApprovalAuditEvent> {
    const store = this.getStore();
    
    const newEvent: ApprovalAuditEvent = {
      id: `adt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      ...event
    };

    store.push(newEvent);
    this.saveStore(store);
    return newEvent;
  }
}

export const auditRepository = new MockApprovalAuditRepository();
