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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          is_active: boolean
          archived_at: string | null
          card_network: string | null
          color: string
          created_at: string
          credit_limit: number | null
          currency: string
          emi_amount: number | null
          end_date: string | null
          id: string
          include_in_analytics: boolean
          include_in_net_worth: boolean
          institution: string | null
          interest_rate: number | null
          last_four: string | null
          liability_status: string
          minimum_payment: number | null
          name: string
          next_payment_date: string | null
          opening_balance: number
          original_principal: number | null
          payment_account_id: string | null
          payment_due_day: number | null
          reminder_days: number[]
          reminders_enabled: boolean
          start_date: string | null
          statement_day: number | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          is_active?: boolean
          archived_at?: string | null
          card_network?: string | null
          color?: string
          created_at?: string
          credit_limit?: number | null
          currency?: string
          emi_amount?: number | null
          end_date?: string | null
          id?: string
          include_in_analytics?: boolean
          include_in_net_worth?: boolean
          institution?: string | null
          interest_rate?: number | null
          last_four?: string | null
          liability_status?: string
          minimum_payment?: number | null
          name: string
          next_payment_date?: string | null
          opening_balance?: number
          original_principal?: number | null
          payment_account_id?: string | null
          payment_due_day?: number | null
          reminder_days?: number[]
          reminders_enabled?: boolean
          start_date?: string | null
          statement_day?: number | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          is_active?: boolean
          archived_at?: string | null
          card_network?: string | null
          color?: string
          created_at?: string
          credit_limit?: number | null
          currency?: string
          emi_amount?: number | null
          end_date?: string | null
          id?: string
          include_in_analytics?: boolean
          include_in_net_worth?: boolean
          institution?: string | null
          interest_rate?: number | null
          last_four?: string | null
          liability_status?: string
          minimum_payment?: number | null
          name?: string
          next_payment_date?: string | null
          opening_balance?: number
          original_principal?: number | null
          payment_account_id?: string | null
          payment_due_day?: number | null
          reminder_days?: number[]
          reminders_enabled?: boolean
          start_date?: string | null
          statement_day?: number | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          allow_transaction_context: boolean
          enabled: boolean
          endpoint: string | null
          model: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_transaction_context?: boolean
          enabled?: boolean
          endpoint?: string | null
          model?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          allow_transaction_context?: boolean
          enabled?: boolean
          endpoint?: string | null
          model?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          checksum: string | null
          content_type: string
          created_at: string
          file_name: string
          id: string
          ocr_result: Json | null
          ocr_status: string
          size_bytes: number
          storage_path: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          checksum?: string | null
          content_type: string
          created_at?: string
          file_name: string
          id?: string
          ocr_result?: Json | null
          ocr_status?: string
          size_bytes: number
          storage_path: string
          transaction_id?: string | null
          user_id?: string
        }
        Update: {
          checksum?: string | null
          content_type?: string
          created_at?: string
          file_name?: string
          id?: string
          ocr_result?: Json | null
          ocr_status?: string
          size_bytes?: number
          storage_path?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_hash: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          account_id: string | null
          amount: number | null
          category_id: string | null
          created_at: string
          currency: string
          due_date: string
          frequency: Database["public"]["Enums"]["frequency_type"] | null
          id: string
          notes: string | null
          reminder_days: number[]
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          category_id?: string | null
          created_at?: string
          currency?: string
          due_date: string
          frequency?: Database["public"]["Enums"]["frequency_type"] | null
          id?: string
          notes?: string | null
          reminder_days?: number[]
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          category_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          frequency?: Database["public"]["Enums"]["frequency_type"] | null
          id?: string
          notes?: string | null
          reminder_days?: number[]
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          budget_id: string
          category_id: string
          user_id: string
        }
        Insert: {
          budget_id: string
          category_id: string
          user_id?: string
        }
        Update: {
          budget_id?: string
          category_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          active: boolean
          alert_threshold: number
          created_at: string
          id: string
          limit_amount: number
          name: string
          period: string
          rollover: boolean
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          alert_threshold?: number
          created_at?: string
          id?: string
          limit_amount: number
          name: string
          period: string
          rollover?: boolean
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          alert_threshold?: number
          created_at?: string
          id?: string
          limit_amount?: number
          name?: string
          period?: string
          rollover?: boolean
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          kind: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          kind: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          default_period: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          default_period?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Update: {
          default_period?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          contributed_at: string
          created_at: string
          goal_id: string
          id: string
          linked_transaction_id: string | null
          notes: string | null
          source_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contributed_at?: string
          created_at?: string
          goal_id: string
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          source_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          contributed_at?: string
          created_at?: string
          goal_id?: string
          id?: string
          linked_transaction_id?: string | null
          notes?: string | null
          source_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          description: string | null
          linked_account_id: string | null
          color: string
          created_at: string
          current_amount: number
          icon: string
          id: string
          name: string
          opening_amount: number
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name: string
          description?: string | null
          linked_account_id?: string | null
          opening_amount?: number
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          current_amount?: number
          icon?: string
          id?: string
          name?: string
          description?: string | null
          linked_account_id?: string | null
          opening_amount?: number
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_rows: {
        Row: {
          created_at: string
          duplicate_transaction_id: string | null
          id: string
          import_id: string
          issue_codes: string[]
          normalized_data: Json | null
          raw_data: Json
          row_number: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicate_transaction_id?: string | null
          id?: string
          import_id: string
          issue_codes?: string[]
          normalized_data?: Json | null
          raw_data: Json
          row_number: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duplicate_transaction_id?: string | null
          id?: string
          import_id?: string
          issue_codes?: string[]
          normalized_data?: Json | null
          raw_data?: Json
          row_number?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_duplicate_transaction_id_fkey"
            columns: ["duplicate_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          account_id: string | null
          created_at: string
          duplicate_rows: number
          error_message: string | null
          failed_rows: number
          file_hash: string | null
          file_name: string
          file_path: string | null
          file_type: string
          id: string
          imported_rows: number
          skipped_rows: number
          source_kind: string
          status: Database["public"]["Enums"]["import_status"]
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          duplicate_rows?: number
          error_message?: string | null
          failed_rows?: number
          file_hash?: string | null
          file_name: string
          file_path?: string | null
          file_type: string
          id?: string
          imported_rows?: number
          skipped_rows?: number
          source_kind?: string
          status?: Database["public"]["Enums"]["import_status"]
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          duplicate_rows?: number
          error_message?: string | null
          failed_rows?: number
          file_hash?: string | null
          file_name?: string
          file_path?: string | null
          file_type?: string
          id?: string
          imported_rows?: number
          skipped_rows?: number
          source_kind?: string
          status?: Database["public"]["Enums"]["import_status"]
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_rules: {
        Row: {
          account_id: string | null
          application_count: number
          category_id: string | null
          created_at: string
          enabled: boolean
          id: string
          match_type: string
          merchant_normalized: string
          pattern: string
          priority: number
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          application_count?: number
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          match_type?: string
          merchant_normalized: string
          pattern: string
          priority?: number
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          application_count?: number
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          match_type?: string
          merchant_normalized?: string
          pattern?: string
          priority?: number
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          bills: boolean
          budgets: boolean
          email_enabled: boolean
          goals: boolean
          imports: boolean
          push_enabled: boolean
          quiet_hours: Json
          recurring: boolean
          subscriptions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bills?: boolean
          budgets?: boolean
          email_enabled?: boolean
          goals?: boolean
          imports?: boolean
          push_enabled?: boolean
          quiet_hours?: Json
          recurring?: boolean
          subscriptions?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          bills?: boolean
          budgets?: boolean
          email_enabled?: boolean
          goals?: boolean
          imports?: boolean
          push_enabled?: boolean
          quiet_hours?: Json
          recurring?: boolean
          subscriptions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          currency: string
          date_format: string
          display_name: string
          first_day_of_week: number
          id: string
          locale: string
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          display_name: string
          first_day_of_week?: number
          id: string
          locale?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          display_name?: string
          first_day_of_week?: number
          id?: string
          locale?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          archived_at: string | null
          notes: string | null
          account_id: string
          active: boolean
          amount: number
          auto_create: boolean
          category_id: string | null
          created_at: string
          currency: string
          custom_rule: Json | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          id: string
          interval_count: number
          merchant: string | null
          next_date: string
          start_date: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          notes?: string | null
          account_id: string
          active?: boolean
          amount: number
          auto_create?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          custom_rule?: Json | null
          end_date?: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          id?: string
          interval_count?: number
          merchant?: string | null
          next_date: string
          start_date: string
          title: string
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          notes?: string | null
          account_id?: string
          active?: boolean
          amount?: number
          auto_create?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          custom_rule?: Json | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          interval_count?: number
          merchant?: string | null
          next_date?: string
          start_date?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_id: string | null
          category_id: string | null
          confidence: number | null
          created_at: string
          currency: string
          estimated_amount: number
          frequency: Database["public"]["Enums"]["frequency_type"]
          id: string
          last_payment_date: string | null
          merchant: string
          next_expected_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          category_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string
          estimated_amount: number
          frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          last_payment_date?: string | null
          merchant: string
          next_expected_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string
          estimated_amount?: number
          frequency?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          last_payment_date?: string | null
          merchant?: string
          next_expected_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_tags: {
        Row: {
          created_at: string
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          transaction_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          duplicate_of_id: string | null
          id: string
          import_id: string | null
          merchant: string
          metadata: Json
          notes: string | null
          occurred_at: string
          payment_method: string | null
          recurring_transaction_id: string | null
          reference: string | null
          refund_of_id: string | null
          review_status: string
          source: Database["public"]["Enums"]["transaction_source"]
          subscription_id: string | null
          tags: string[]
          transfer_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duplicate_of_id?: string | null
          id?: string
          import_id?: string | null
          merchant?: string
          metadata?: Json
          notes?: string | null
          occurred_at: string
          payment_method?: string | null
          recurring_transaction_id?: string | null
          reference?: string | null
          refund_of_id?: string | null
          review_status?: string
          source?: Database["public"]["Enums"]["transaction_source"]
          subscription_id?: string | null
          tags?: string[]
          transfer_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duplicate_of_id?: string | null
          id?: string
          import_id?: string | null
          merchant?: string
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          recurring_transaction_id?: string | null
          reference?: string | null
          refund_of_id?: string | null
          review_status?: string
          source?: Database["public"]["Enums"]["transaction_source"]
          subscription_id?: string | null
          tags?: string[]
          transfer_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refund_of_id_fkey"
            columns: ["refund_of_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_account_id_fkey"
            columns: ["transfer_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_account_id_fkey"
            columns: ["transfer_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          balance: number | null
          currency: string | null
          id: string | null
          name: string | null
          type: Database["public"]["Enums"]["account_type"] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_category_safely: { Args: { target_category_id: string }; Returns: undefined }
      delete_goal_safely: { Args: { target_goal_id: string }; Returns: undefined }
      search_finance_transactions: { Args: { filters?: Json }; Returns: Json }
      finance_period_report: { Args: { date_from: string; date_to: string; account_filter?: string }; Returns: Json }
      save_budget_details: { Args: { target_id: string | null; details: Json; category_ids: string[] }; Returns: string }
      archive_category_safely: {
        Args: { target_category_id: string }
        Returns: undefined
      }
      monthly_financial_summary: {
        Args: { month_start?: string }
        Returns: {
          gross_spending: number
          income: number
          net_spending: number
          refunds: number
          savings: number
          savings_rate: number
        }[]
      }
    }
    Enums: {
      account_type:
        | "bank"
        | "savings"
        | "current"
        | "checking"
        | "cash"
        | "credit_card"
        | "debit_card"
        | "prepaid_card"
        | "loan"
        | "investment"
        | "wallet"
        | "asset"
        | "liability"
      frequency_type:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "custom"
      import_status:
        | "uploaded"
        | "parsing"
        | "review"
        | "imported"
        | "failed"
        | "cancelled"
      transaction_source:
        | "manual"
        | "voice"
        | "csv"
        | "xlsx"
        | "pdf"
        | "ocr"
        | "recurring"
      transaction_type:
        | "expense"
        | "income"
        | "transfer"
        | "refund"
        | "adjustment"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_type: [
        "bank",
        "savings",
        "current",
        "checking",
        "cash",
        "credit_card",
        "debit_card",
        "prepaid_card",
        "loan",
        "investment",
        "wallet",
        "asset",
        "liability",
      ],
      frequency_type: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
        "custom",
      ],
      import_status: [
        "uploaded",
        "parsing",
        "review",
        "imported",
        "failed",
        "cancelled",
      ],
      transaction_source: [
        "manual",
        "voice",
        "csv",
        "xlsx",
        "pdf",
        "ocr",
        "recurring",
      ],
      transaction_type: [
        "expense",
        "income",
        "transfer",
        "refund",
        "adjustment",
      ],
    },
  },
} as const
