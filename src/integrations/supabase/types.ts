export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crawl_jobs: {
        Row: {
          api_key_id: string | null
          cancelled_at: string | null
          created_at: string
          credits_used: number
          discovered_count: number
          error_code: string | null
          error_message: string | null
          exclude_patterns_json: Json | null
          failed_count: number
          finished_at: string | null
          id: string
          include_patterns_json: Json | null
          include_subdomains: boolean
          max_depth: number
          max_pages: number
          normalized_root_url: string
          only_main_content: boolean
          processed_count: number
          queued_count: number
          render_javascript: boolean
          root_url: string
          same_domain_only: boolean
          started_at: string | null
          status: string
          timeout_ms: number
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          credits_used?: number
          discovered_count?: number
          error_code?: string | null
          error_message?: string | null
          exclude_patterns_json?: Json | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          include_patterns_json?: Json | null
          include_subdomains?: boolean
          max_depth?: number
          max_pages?: number
          normalized_root_url: string
          only_main_content?: boolean
          processed_count?: number
          queued_count?: number
          render_javascript?: boolean
          root_url: string
          same_domain_only?: boolean
          started_at?: string | null
          status?: string
          timeout_ms?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          credits_used?: number
          discovered_count?: number
          error_code?: string | null
          error_message?: string | null
          exclude_patterns_json?: Json | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          include_patterns_json?: Json | null
          include_subdomains?: boolean
          max_depth?: number
          max_pages?: number
          normalized_root_url?: string
          only_main_content?: boolean
          processed_count?: number
          queued_count?: number
          render_javascript?: boolean
          root_url?: string
          same_domain_only?: boolean
          started_at?: string | null
          status?: string
          timeout_ms?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_pages: {
        Row: {
          crawl_job_id: string
          depth: number
          discovered_at: string
          error_code: string | null
          error_message: string | null
          final_url: string | null
          html: string | null
          http_status_code: number | null
          id: string
          links_json: Json | null
          markdown: string | null
          metadata_json: Json | null
          normalized_url: string
          parent_page_id: string | null
          queued_at: string | null
          scraped_at: string | null
          screenshot_url: string | null
          status: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          crawl_job_id: string
          depth?: number
          discovered_at?: string
          error_code?: string | null
          error_message?: string | null
          final_url?: string | null
          html?: string | null
          http_status_code?: number | null
          id?: string
          links_json?: Json | null
          markdown?: string | null
          metadata_json?: Json | null
          normalized_url: string
          parent_page_id?: string | null
          queued_at?: string | null
          scraped_at?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          crawl_job_id?: string
          depth?: number
          discovered_at?: string
          error_code?: string | null
          error_message?: string | null
          final_url?: string | null
          html?: string | null
          http_status_code?: number | null
          id?: string
          links_json?: Json | null
          markdown?: string | null
          metadata_json?: Json | null
          normalized_url?: string
          parent_page_id?: string | null
          queued_at?: string | null
          scraped_at?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_pages_crawl_job_id_fkey"
            columns: ["crawl_job_id"]
            isOneToOne: false
            referencedRelation: "crawl_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "crawl_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_jobs: {
        Row: {
          api_key_id: string | null
          created_at: string
          credits_used: number
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_markdown: string | null
          model: string
          output_json: Json | null
          prompt: string | null
          provider: string
          schema_json: Json | null
          scrape_job_id: string | null
          source_url: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          validation_json: Json | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          credits_used?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_markdown?: string | null
          model: string
          output_json?: Json | null
          prompt?: string | null
          provider?: string
          schema_json?: Json | null
          scrape_job_id?: string | null
          source_url: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validation_json?: Json | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          credits_used?: number
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_markdown?: string | null
          model?: string
          output_json?: Json | null
          prompt?: string | null
          provider?: string
          schema_json?: Json | null
          scrape_job_id?: string | null
          source_url?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validation_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits_used: number
          current_period_end: string | null
          current_period_start: string | null
          extra_credits: number
          full_name: string | null
          id: string
          monthly_credits: number
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          extra_credits?: number
          full_name?: string | null
          id?: string
          monthly_credits?: number
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          extra_credits?: number
          full_name?: string | null
          id?: string
          monthly_credits?: number
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scrape_jobs: {
        Row: {
          api_key_id: string | null
          created_at: string
          credits_used: number
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          final_url: string | null
          html: string | null
          http_status_code: number | null
          id: string
          links_json: Json | null
          markdown: string | null
          metadata_json: Json | null
          mode: string
          request_json: Json | null
          screenshot_url: string | null
          status: string
          title: string | null
          updated_at: string
          url: string
          user_id: string
          warnings_json: Json | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          credits_used?: number
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          final_url?: string | null
          html?: string | null
          http_status_code?: number | null
          id?: string
          links_json?: Json | null
          markdown?: string | null
          metadata_json?: Json | null
          mode?: string
          request_json?: Json | null
          screenshot_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
          warnings_json?: Json | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          credits_used?: number
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          final_url?: string | null
          html?: string | null
          http_status_code?: number | null
          id?: string
          links_json?: Json | null
          markdown?: string | null
          metadata_json?: Json | null
          mode?: string
          request_json?: Json | null
          screenshot_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          warnings_json?: Json | null
        }
        Relationships: []
      }
      usage_ledger: {
        Row: {
          action: string
          api_key_id: string | null
          balance_after: number | null
          created_at: string
          credits: number
          id: string
          job_id: string | null
          metadata_json: Json | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          api_key_id?: string | null
          balance_after?: number | null
          created_at?: string
          credits: number
          id?: string
          job_id?: string | null
          metadata_json?: Json | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          api_key_id?: string | null
          balance_after?: number | null
          created_at?: string
          credits?: number
          id?: string
          job_id?: string | null
          metadata_json?: Json | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_ledger_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
