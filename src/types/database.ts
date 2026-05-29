export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          subscription_plan: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          subscription_plan?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          subscription_plan?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          agency_id: string | null
          email: string
          full_name: string
          avatar_url: string | null
          role: 'owner' | 'admin' | 'migration_agent' | 'assistant' | 'read_only' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          agency_id?: string | null
          email: string
          full_name: string
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'migration_agent' | 'assistant' | 'read_only' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string | null
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'migration_agent' | 'assistant' | 'read_only' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          agency_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: string
          status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing'
          current_period_end: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan: string
          status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing'
          current_period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: string
          status?: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing'
          current_period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      clients: {
        Row: {
          id: string
          agency_id: string
          first_name: string
          last_name: string
          email: string
          visa_type: string | null
          phone: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          first_name: string
          last_name: string
          email: string
          visa_type?: string | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          first_name?: string
          last_name?: string
          email?: string
          visa_type?: string | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      agreements: {
        Row: {
          id: string
          agency_id: string
          created_by: string | null
          client_id: string
          title: string
          status: 'draft' | 'pending' | 'viewed' | 'signed' | 'canceled' | 'expired' | null
          signwell_id: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          created_by?: string | null
          client_id: string
          title: string
          status?: 'draft' | 'pending' | 'viewed' | 'signed' | 'canceled' | 'expired' | null
          signwell_id?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          created_by?: string | null
          client_id?: string
          title?: string
          status?: 'draft' | 'pending' | 'viewed' | 'signed' | 'canceled' | 'expired' | null
          signwell_id?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          agency_id: string
          agreement_id: string | null
          storage_path: string
          file_name: string
          file_type: string | null
          file_size: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          agreement_id?: string | null
          storage_path: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          agreement_id?: string | null
          storage_path?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          agency_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          metadata?: Json | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_agency_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'owner' | 'admin' | 'migration_agent' | 'assistant' | 'read_only'
      subscription_status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing'
      agreement_status: 'draft' | 'pending' | 'viewed' | 'signed' | 'canceled' | 'expired'
    }
  }
}
