import { create } from "zustand"

export interface ClientItem {
  name: string
  email: string
  matters: number
  stage: string
  value: string
}

export interface DocumentItem {
  id: string
  name: string
  category: string
  size: string
  type: string
  date: string
  downloads: number
}

export interface AgreementItem {
  id: string
  client: string
  email: string
  matter: string
  fee: string
  status: string
  date: string
  scope: string
  law: string
}

interface DemoState {
  clientsList: ClientItem[]
  documentsList: DocumentItem[]
  agreementsList: AgreementItem[]
  
  // Actions
  addClient: (client: ClientItem) => void
  addDocument: (doc: DocumentItem) => void
  deleteDocument: (id: string) => void
  addAgreement: (agreement: AgreementItem) => void
  updateAgreementStatus: (id: string, status: string) => void
}

/**
 * @deprecated DEPRECATED: This store was used during the prototyping phase to simulate
 * database persistence. Do not use this for new features. All data should now be
 * fetched and mutated via Supabase and `useSupabaseData.ts`.
 * 
 * This file is retained temporarily until a final zero-reference audit confirms 
 * it is safely stripped from all transitive imports.
 */

const initialClients: ClientItem[] = []
const initialDocuments: DocumentItem[] = []
const initialAgreements: AgreementItem[] = []

export const useDemoStore = create<DemoState>((set) => ({
  clientsList: initialClients,
  documentsList: initialDocuments,
  agreementsList: initialAgreements,
  
  addClient: (client) => set((state) => ({ clientsList: [client, ...state.clientsList] })),
  addDocument: (doc) => set((state) => ({ documentsList: [doc, ...state.documentsList] })),
  deleteDocument: (id) => set((state) => ({ documentsList: state.documentsList.filter((d) => d.id !== id) })),
  addAgreement: (agreement) => set((state) => ({ agreementsList: [agreement, ...state.agreementsList] })),
  updateAgreementStatus: (id, status) => set((state) => ({
    agreementsList: state.agreementsList.map((a) => a.id === id ? { ...a, status } : a)
  }))
}))
