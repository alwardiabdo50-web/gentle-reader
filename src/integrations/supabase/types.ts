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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_credit_costs: {
        Row: {
          base_cost: number
          created_at: string
          id: string
          is_active: boolean
          is_addon: boolean
          label: string
          plan_overrides: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_cost?: number
          created_at?: string
          id: string
          is_active?: boolean
          is_addon?: boolean
          label: string
          plan_overrides?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_addon?: boolean
          label?: string
          plan_overrides?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string
          id: string
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          message: string | null
          name: string
          status: string
          volume: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          status?: string
          volume?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          status?: string
          volume?: string | null
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
      extraction_template_versions: {
        Row: {
          change_note: string | null
          created_at: string
          id: string
          model: string
          prompt: string | null
          schema_json: Json | null
          template_id: string
          version: number
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          id?: string
          model: string
          prompt?: string | null
          schema_json?: Json | null
          template_id: string
          version: number
        }
        Update: {
          change_note?: string | null
          created_at?: string
          id?: string
          model?: string
          prompt?: string | null
          schema_json?: Json | null
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "extraction_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "extraction_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          model: string
          name: string
          prompt: string | null
          schema_json: Json | null
          tags: string[] | null
          updated_at: string
          use_count: number
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          model?: string
          name: string
          prompt?: string | null
          schema_json?: Json | null
          tags?: string[] | null
          updated_at?: string
          use_count?: number
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          model?: string
          name?: string
          prompt?: string | null
          schema_json?: Json | null
          tags?: string[] | null
          updated_at?: string
          use_count?: number
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          credits_used: number
          current_period_end: string | null
          current_period_start: string | null
          extra_credits: number
          id: string
          monthly_credits: number
          name: string
          owner_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          extra_credits?: number
          id?: string
          monthly_credits?: number
          name: string
          owner_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          extra_credits?: number
          id?: string
          monthly_credits?: number
          name?: string
          owner_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          credits_used: number | null
          error_code: string | null
          error_message: string | null
          extract_result: Json | null
          extraction_job_id: string | null
          final_output: Json | null
          finished_at: string | null
          id: string
          pipeline_id: string | null
          scrape_job_id: string | null
          scrape_result: Json | null
          source_url: string
          started_at: string | null
          status: string | null
          transform_result: Json | null
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          credits_used?: number | null
          error_code?: string | null
          error_message?: string | null
          extract_result?: Json | null
          extraction_job_id?: string | null
          final_output?: Json | null
          finished_at?: string | null
          id?: string
          pipeline_id?: string | null
          scrape_job_id?: string | null
          scrape_result?: Json | null
          source_url: string
          started_at?: string | null
          status?: string | null
          transform_result?: Json | null
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          credits_used?: number | null
          error_code?: string | null
          error_message?: string | null
          extract_result?: Json | null
          extraction_job_id?: string | null
          final_output?: Json | null
          finished_at?: string | null
          id?: string
          pipeline_id?: string | null
          scrape_job_id?: string | null
          scrape_result?: Json | null
          source_url?: string
          started_at?: string | null
          status?: string | null
          transform_result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          extract_model: string | null
          extract_prompt: string | null
          extract_schema: Json | null
          id: string
          is_active: boolean | null
          name: string
          scrape_options: Json | null
          transform_model: string | null
          transform_prompt: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          extract_model?: string | null
          extract_prompt?: string | null
          extract_schema?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          scrape_options?: Json | null
          transform_model?: string | null
          transform_prompt?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          extract_model?: string | null
          extract_prompt?: string | null
          extract_schema?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          scrape_options?: Json | null
          transform_model?: string | null
          transform_prompt?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          cta_text: string
          description: string | null
          display_features: Json
          features_json: Json
          highlighted: boolean
          id: string
          is_active: boolean
          max_api_keys: number
          monthly_credits: number
          monthly_price: number
          name: string
          original_monthly_price: number | null
          original_yearly_price: number | null
          rate_limit_rpm: number
          sort_order: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          created_at?: string
          cta_text?: string
          description?: string | null
          display_features?: Json
          features_json?: Json
          highlighted?: boolean
          id: string
          is_active?: boolean
          max_api_keys?: number
          monthly_credits?: number
          monthly_price?: number
          name: string
          original_monthly_price?: number | null
          original_yearly_price?: number | null
          rate_limit_rpm?: number
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          created_at?: string
          cta_text?: string
          description?: string | null
          display_features?: Json
          features_json?: Json
          highlighted?: boolean
          id?: string
          is_active?: boolean
          max_api_keys?: number
          monthly_credits?: number
          monthly_price?: number
          name?: string
          original_monthly_price?: number | null
          original_yearly_price?: number | null
          rate_limit_rpm?: number
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      playground_presets: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          mode: string
          name: string
          user_id: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          id?: string
          mode: string
          name: string
          user_id: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          mode?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_org_id: string | null
          avatar_url: string | null
          created_at: string
          credits_used: number
          current_period_end: string | null
          current_period_start: string | null
          extra_credits: number
          full_name: string | null
          id: string
          monthly_credits: number
          onboarding_completed: boolean
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_org_id?: string | null
          avatar_url?: string | null
          created_at?: string
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          extra_credits?: number
          full_name?: string | null
          id?: string
          monthly_credits?: number
          onboarding_completed?: boolean
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_org_id?: string | null
          avatar_url?: string | null
          created_at?: string
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          extra_credits?: number
          full_name?: string | null
          id?: string
          monthly_credits?: number
          onboarding_completed?: boolean
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_org_id_fkey"
            columns: ["active_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          endpoint: string
          hit_at: string
          id: string
          user_id: string
          was_limited: boolean
        }
        Insert: {
          endpoint: string
          hit_at?: string
          id?: string
          user_id: string
          was_limited?: boolean
        }
        Update: {
          endpoint?: string
          hit_at?: string
          id?: string
          user_id?: string
          was_limited?: boolean
        }
        Relationships: []
      }
      schedule_runs: {
        Row: {
          content_changed: boolean | null
          content_hash: string | null
          created_at: string
          diff_summary_json: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_id: string | null
          job_type: string
          schedule_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          content_changed?: boolean | null
          content_hash?: string | null
          created_at?: string
          diff_summary_json?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string | null
          job_type: string
          schedule_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          content_changed?: boolean | null
          content_hash?: string | null
          created_at?: string
          diff_summary_json?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string | null
          job_type?: string
          schedule_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          config_json: Json
          created_at: string
          cron_expression: string
          description: string | null
          enable_diff: boolean
          id: string
          is_active: boolean
          job_type: string
          last_content_hash: string | null
          last_diff_json: Json | null
          last_job_id: string | null
          last_run_at: string | null
          last_status: string | null
          name: string
          next_run_at: string | null
          run_count: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          cron_expression?: string
          description?: string | null
          enable_diff?: boolean
          id?: string
          is_active?: boolean
          job_type?: string
          last_content_hash?: string | null
          last_diff_json?: Json | null
          last_job_id?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name: string
          next_run_at?: string | null
          run_count?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          cron_expression?: string
          description?: string | null
          enable_diff?: boolean
          id?: string
          is_active?: boolean
          job_type?: string
          last_content_hash?: string | null
          last_diff_json?: Json | null
          last_job_id?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          next_run_at?: string | null
          run_count?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scrape_cache: {
        Row: {
          cache_key: string
          created_at: string
          duration_ms: number | null
          expires_at: string
          final_url: string | null
          html: string | null
          id: string
          links_json: Json | null
          markdown: string | null
          metadata_json: Json | null
          status_code: number | null
          title: string | null
          url: string
          warnings_json: Json | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          duration_ms?: number | null
          expires_at: string
          final_url?: string | null
          html?: string | null
          id?: string
          links_json?: Json | null
          markdown?: string | null
          metadata_json?: Json | null
          status_code?: number | null
          title?: string | null
          url: string
          warnings_json?: Json | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          duration_ms?: number | null
          expires_at?: string
          final_url?: string | null
          html?: string | null
          id?: string
          links_json?: Json | null
          markdown?: string | null
          metadata_json?: Json | null
          status_code?: number | null
          title?: string | null
          url?: string
          warnings_json?: Json | null
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
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string | null
          price_id: string | null
          product_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          price_id?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          price_id?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_type: string
          failed_at: string | null
          http_status_code: number | null
          id: string
          job_id: string | null
          job_type: string
          max_attempts: number
          next_retry_at: string | null
          payload_json: Json
          response_body: string | null
          status: string
          updated_at: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          failed_at?: string | null
          http_status_code?: number | null
          id?: string
          job_id?: string | null
          job_type: string
          max_attempts?: number
          next_retry_at?: string | null
          payload_json?: Json
          response_body?: string | null
          status?: string
          updated_at?: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          failed_at?: string | null
          http_status_code?: number | null
          id?: string
          job_id?: string | null
          job_type?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload_json?: Json
          response_body?: string | null
          status?: string
          updated_at?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload_json: Json
          processed: boolean
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload_json: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          description: string | null
          events: string[]
          id: string
          is_active: boolean
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_org_owner_credits: {
        Args: { _org_id: string }
        Returns: {
          credits_used: number
          current_period_end: string
          extra_credits: number
          monthly_credits: number
          plan: string
        }[]
      }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      get_user_by_stripe_customer: {
        Args: { stripe_customer_id: string }
        Returns: {
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      org_role: "owner" | "member" | "viewer"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      org_role: ["owner", "member", "viewer"],
    },
  },
} as const
