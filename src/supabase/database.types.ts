/**
 * Tipos do schema público do PostgreSQL (Supabase).
 *
 * Para regenerar diretamente do banco conectado:
 *   SUPABASE_PROJECT_ID=<id> npm run db:types
 *
 * Mantido versionado para garantir segurança de tipos ponta a ponta entre
 * migrations SQL (supabase/migrations/), API Express (api/) e cliente React.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: 'admin' | 'editor' | 'viewer';
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: 'admin' | 'editor' | 'viewer';
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          role?: 'admin' | 'editor' | 'viewer';
          created_at?: string;
        };
        Relationships: [];
      };
      erp_snapshots: {
        Row: {
          organization_id: string;
          version: number;
          payload: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          organization_id: string;
          version?: number;
          payload: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          organization_id?: string;
          version?: number;
          payload?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      erp_public_submissions: {
        Row: {
          id: string;
          organization_id: string;
          kind: string;
          status: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          kind: string;
          status?: string;
          payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          kind?: string;
          status?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      erp_requests: {
        Row: {
          id: string;
          organization_id: string;
          status: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          status: string;
          payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          status?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      erp_dev_owners: {
        Row: {
          organization_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      erp_access_rules: {
        Row: {
          organization_id: string;
          user_id: string;
          tab: string;
          actions: string[];
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          tab: string;
          actions: string[];
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          tab?: string;
          actions?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      erp_access_audit: {
        Row: {
          id: number;
          organization_id: string;
          actor_id: string;
          target_user_id: string;
          kind: string;
          item: string;
          before_value: string | null;
          after_value: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          organization_id: string;
          actor_id: string;
          target_user_id: string;
          kind: string;
          item: string;
          before_value?: string | null;
          after_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          organization_id?: string;
          actor_id?: string;
          target_user_id?: string;
          kind?: string;
          item?: string;
          before_value?: string | null;
          after_value?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      erp_first_access_tokens: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          email: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          email: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          email?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      publish_erp_snapshot: {
        Args: { p_organization_id: string; p_expected_updated_at: string | null; p_payload: Json };
        Returns: Json;
      };
      apply_erp_snapshot_changes: {
        Args: { p_organization_id: string; p_changes: Json };
        Returns: Json;
      };
      erp_tabelas_encolhidas: {
        Args: { p_antes: Json; p_depois: Json; p_tabelas?: string[] | null };
        Returns: { tabela: string; antes: number; depois: number; sumidos: number }[];
      };
      erp_is_dev: {
        Args: { p_organization_id: string; p_user_id: string };
        Returns: boolean;
      };
      erp_dev_panel: {
        Args: { p_organization_id: string; p_actor_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
