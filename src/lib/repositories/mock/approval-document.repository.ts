import { 
  ApprovalDocument, 
  IApprovalDocumentRepository 
} from '@/types/approval';

const STORAGE_KEY = 'immisign_mock_approval_docs';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockApprovalDocumentRepository implements IApprovalDocumentRepository {
  private getStore(): ApprovalDocument[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveStore(data: ApprovalDocument[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async listByApplication(applicationId: string): Promise<ApprovalDocument[]> {
    await delay(200);
    const store = this.getStore();
    return store.filter(d => d.applicationId === applicationId);
  }

  async create(document: Partial<ApprovalDocument>): Promise<ApprovalDocument> {
    await delay(400);
    const store = this.getStore();
    
    const newDoc: ApprovalDocument = {
      id: `doc-${Date.now()}`,
      name: document.name || 'Untitled Document',
      size: document.size || 0,
      type: document.type || 'application/pdf',
      url: document.url,
      status: document.status || 'pending',
      version: document.version || 1,
      uploadedBy: document.uploadedBy || 'system',
      uploadedAt: new Date().toISOString(),
      applicationId: document.applicationId!,
      agencyId: document.agencyId!,
    };

    store.push(newDoc);
    this.saveStore(store);
    return newDoc;
  }

  async update(id: string, updates: Partial<ApprovalDocument>): Promise<ApprovalDocument> {
    await delay(200);
    const store = this.getStore();
    const idx = store.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Document not found');

    const updated = {
      ...store[idx],
      ...updates
    };
    
    store[idx] = updated;
    this.saveStore(store);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await delay(150);
    const store = this.getStore();
    this.saveStore(store.filter(d => d.id !== id));
  }
}

export const documentRepository = new MockApprovalDocumentRepository();
