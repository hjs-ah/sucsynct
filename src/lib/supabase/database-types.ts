// Generated from the live schema via the Supabase MCP tool
// (mcp__Supabase__generate_typescript_types). Regenerate after any
// migration that changes `profiles` or `entries`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      entries: {
        Row: {
          audience: string;
          created_at: string;
          goal: string;
          id: string;
          mode: string;
          scores: Json;
          self_score: number | null;
          story_text: string;
          user_id: string;
        };
        Insert: {
          audience?: string;
          created_at?: string;
          goal?: string;
          id?: string;
          mode: string;
          scores: Json;
          self_score?: number | null;
          story_text?: string;
          user_id: string;
        };
        Update: {
          audience?: string;
          created_at?: string;
          goal?: string;
          id?: string;
          mode?: string;
          scores?: Json;
          self_score?: number | null;
          story_text?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          analyzer_strictness: string;
          auto_delete_audio: boolean;
          created_at: string;
          focus: string[];
          id: string;
          onboarded: boolean;
        };
        Insert: {
          analyzer_strictness?: string;
          auto_delete_audio?: boolean;
          created_at?: string;
          focus?: string[];
          id: string;
          onboarded?: boolean;
        };
        Update: {
          analyzer_strictness?: string;
          auto_delete_audio?: boolean;
          created_at?: string;
          focus?: string[];
          id?: string;
          onboarded?: boolean;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
