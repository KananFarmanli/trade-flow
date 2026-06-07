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
      account_balances: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          cash_balance: number
          id: string
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          cash_balance?: number
          id?: string
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          cash_balance?: number
          id?: string
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          comment: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      balance_operations: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          is_loan: boolean
          op_date: string
          source: string | null
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_loan?: boolean
          op_date?: string
          source?: string | null
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_loan?: boolean
          op_date?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      batches: {
        Row: {
          arrival_date: string
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          qty_received: number
          record_created_at: string
          unit_cost: number
        }
        Insert: {
          arrival_date: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          qty_received: number
          record_created_at?: string
          unit_cost: number
        }
        Update: {
          arrival_date?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          qty_received?: number
          record_created_at?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_credit_movements: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          created_by: string | null
          doctor_id: string
          id: string
          reason: Database["public"]["Enums"]["credit_reason"]
          source_realization_id: string | null
          source_return_id: string | null
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id: string
          id?: string
          reason: Database["public"]["Enums"]["credit_reason"]
          source_realization_id?: string | null
          source_return_id?: string | null
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          id?: string
          reason?: Database["public"]["Enums"]["credit_reason"]
          source_realization_id?: string | null
          source_return_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_credit_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_credit_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "doctor_credit_movements_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_credit_movements_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
        ]
      }
      doctors: {
        Row: {
          assigned_seller_id: string | null
          clinic: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          first_name: string
          id: string
          instagram: string | null
          is_active: boolean
          last_name: string
          phone: string | null
        }
        Insert: {
          assigned_seller_id?: string | null
          clinic?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          first_name: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          last_name: string
          phone?: string | null
        }
        Update: {
          assigned_seller_id?: string | null
          clinic?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          first_name?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          last_name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "doctors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      expenses: {
        Row: {
          added_by: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          comment: string | null
          created_at: string
          expense_date: string
          id: string
          status: Database["public"]["Enums"]["expense_status"]
        }
        Insert: {
          added_by?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          comment?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Update: {
          added_by?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          comment?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Relationships: [
          {
            foreignKeyName: "expenses_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      money_movements: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          comment: string | null
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["money_direction"]
          id: string
          movement_type: Database["public"]["Enums"]["money_movement_type"]
          seller_id: string | null
          source_op_id: string | null
          source_op_type: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["money_direction"]
          id?: string
          movement_type: Database["public"]["Enums"]["money_movement_type"]
          seller_id?: string | null
          source_op_id?: string | null
          source_op_type?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["money_direction"]
          id?: string
          movement_type?: Database["public"]["Enums"]["money_movement_type"]
          seller_id?: string | null
          source_op_id?: string | null
          source_op_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "money_movements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      money_transfers: {
        Row: {
          amount: number
          comment: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          id: string
          initiated_at: string
          initiated_by: string | null
          seller_id: string
          status: Database["public"]["Enums"]["transfer_status"]
        }
        Insert: {
          amount: number
          comment?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Update: {
          amount?: number
          comment?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "money_transfers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_transfers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "money_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "money_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          payment_date: string
          realization_id: string
          received_by: string | null
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payment_date?: string
          realization_id: string
          received_by?: string | null
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payment_date?: string
          realization_id?: string
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "payments_realization_id_fkey"
            columns: ["realization_id"]
            isOneToOne: false
            referencedRelation: "realizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_realization_id_fkey"
            columns: ["realization_id"]
            isOneToOne: false
            referencedRelation: "v_realization_status"
            referencedColumns: ["realization_id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          comment: string | null
          created_at: string
          current_consignment_price: number
          current_retail_price: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string | null
          comment?: string | null
          created_at?: string
          current_consignment_price?: number
          current_retail_price?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string | null
          comment?: string | null
          created_at?: string
          current_consignment_price?: number
          current_retail_price?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          comment: string | null
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          seller_color: string | null
          username: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          first_name: string
          id: string
          is_active?: boolean
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          seller_color?: string | null
          username: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          seller_color?: string | null
          username?: string
        }
        Relationships: []
      }
      quota_months: {
        Row: {
          goal_amount: number
          id: string
          month_index: number
          period_end: string
          period_start: string
          quota_id: string
        }
        Insert: {
          goal_amount: number
          id?: string
          month_index: number
          period_end: string
          period_start: string
          quota_id: string
        }
        Update: {
          goal_amount?: number
          id?: string
          month_index?: number
          period_end?: string
          period_start?: string
          quota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quota_months_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
        ]
      }
      quota_templates: {
        Row: {
          allowed_deviation_pct: number
          created_at: string
          created_by: string | null
          duration_months: number
          id: string
          is_active: boolean
          monthly_goal: number
          name: string
          total_goal: number
        }
        Insert: {
          allowed_deviation_pct?: number
          created_at?: string
          created_by?: string | null
          duration_months: number
          id?: string
          is_active?: boolean
          monthly_goal: number
          name: string
          total_goal: number
        }
        Update: {
          allowed_deviation_pct?: number
          created_at?: string
          created_by?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          monthly_goal?: number
          name?: string
          total_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: "quota_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      quotas: {
        Row: {
          created_at: string
          created_by: string | null
          deviation_pct_snapshot: number
          doctor_id: string
          duration_snapshot: number
          id: string
          monthly_goal_snapshot: number
          name_snapshot: string
          seller_id: string
          start_date: string
          status: Database["public"]["Enums"]["quota_status"]
          template_id: string | null
          total_goal_snapshot: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deviation_pct_snapshot: number
          doctor_id: string
          duration_snapshot: number
          id?: string
          monthly_goal_snapshot: number
          name_snapshot: string
          seller_id: string
          start_date: string
          status?: Database["public"]["Enums"]["quota_status"]
          template_id?: string | null
          total_goal_snapshot: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deviation_pct_snapshot?: number
          doctor_id?: string
          duration_snapshot?: number
          id?: string
          monthly_goal_snapshot?: number
          name_snapshot?: string
          seller_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["quota_status"]
          template_id?: string | null
          total_goal_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "quotas_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "quotas_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "quotas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quota_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      realization_items: {
        Row: {
          actual_unit_price: number
          bonus_reason: string | null
          comment: string | null
          id: string
          is_free: boolean
          line_amount: number
          price_type: Database["public"]["Enums"]["price_type"]
          product_id: string
          quantity: number
          realization_id: string
          unit_consignment_snapshot: number
          unit_retail_snapshot: number
        }
        Insert: {
          actual_unit_price: number
          bonus_reason?: string | null
          comment?: string | null
          id?: string
          is_free?: boolean
          line_amount: number
          price_type: Database["public"]["Enums"]["price_type"]
          product_id: string
          quantity: number
          realization_id: string
          unit_consignment_snapshot?: number
          unit_retail_snapshot?: number
        }
        Update: {
          actual_unit_price?: number
          bonus_reason?: string | null
          comment?: string | null
          id?: string
          is_free?: boolean
          line_amount?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          product_id?: string
          quantity?: number
          realization_id?: string
          unit_consignment_snapshot?: number
          unit_retail_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "realization_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realization_items_realization_id_fkey"
            columns: ["realization_id"]
            isOneToOne: false
            referencedRelation: "realizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realization_items_realization_id_fkey"
            columns: ["realization_id"]
            isOneToOne: false
            referencedRelation: "v_realization_status"
            referencedColumns: ["realization_id"]
          },
        ]
      }
      realizations: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          doctor_id: string
          id: string
          quota_id: string | null
          realization_date: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id: string
          id?: string
          quota_id?: string | null
          realization_date?: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          id?: string
          quota_id?: string | null
          realization_date?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "realizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "realizations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "realizations_quota_fk"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      returns: {
        Row: {
          batch_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          id: string
          product_id: string
          quantity: number
          refund_amount: number | null
          refund_source: Database["public"]["Enums"]["refund_source"] | null
          return_date: string
          return_type: Database["public"]["Enums"]["return_type"]
          seller_id: string | null
          source_item_id: string | null
          source_op_id: string | null
          source_op_type: string | null
          total_amount_delta: number
        }
        Insert: {
          batch_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          id?: string
          product_id: string
          quantity: number
          refund_amount?: number | null
          refund_source?: Database["public"]["Enums"]["refund_source"] | null
          return_date?: string
          return_type: Database["public"]["Enums"]["return_type"]
          seller_id?: string | null
          source_item_id?: string | null
          source_op_id?: string | null
          source_op_type?: string | null
          total_amount_delta?: number
        }
        Update: {
          batch_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          refund_amount?: number | null
          refund_source?: Database["public"]["Enums"]["refund_source"] | null
          return_date?: string
          return_type?: Database["public"]["Enums"]["return_type"]
          seller_id?: string | null
          source_item_id?: string | null
          source_op_id?: string | null
          source_op_type?: string | null
          total_amount_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "returns_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "returns_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      sale_items: {
        Row: {
          actual_unit_price: number
          bonus_reason: string | null
          comment: string | null
          id: string
          is_free: boolean
          line_amount: number
          price_type: Database["public"]["Enums"]["price_type"]
          product_id: string
          quantity: number
          sale_id: string
          unit_consignment_snapshot: number
          unit_retail_snapshot: number
        }
        Insert: {
          actual_unit_price: number
          bonus_reason?: string | null
          comment?: string | null
          id?: string
          is_free?: boolean
          line_amount: number
          price_type: Database["public"]["Enums"]["price_type"]
          product_id: string
          quantity: number
          sale_id: string
          unit_consignment_snapshot?: number
          unit_retail_snapshot?: number
        }
        Update: {
          actual_unit_price?: number
          bonus_reason?: string | null
          comment?: string | null
          id?: string
          is_free?: boolean
          line_amount?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          product_id?: string
          quantity?: number
          sale_id?: string
          unit_consignment_snapshot?: number
          unit_retail_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_sale_economics"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      sales: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          doctor_id: string
          id: string
          quota_id: string | null
          sale_date: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id: string
          id?: string
          quota_id?: string | null
          sale_date?: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          id?: string
          quota_id?: string | null
          sale_date?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "sales_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "sales_quota_fk"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          batch_id: string
          holder_type: Database["public"]["Enums"]["holder_type"]
          id: string
          product_id: string
          quantity: number
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          holder_type: Database["public"]["Enums"]["holder_type"]
          id?: string
          product_id: string
          quantity?: number
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          holder_type?: Database["public"]["Enums"]["holder_type"]
          id?: string
          product_id?: string
          quantity?: number
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          from_holder_type: Database["public"]["Enums"]["holder_type"] | null
          from_seller_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          source_op_id: string | null
          source_op_type: string | null
          to_holder_type: Database["public"]["Enums"]["holder_type"] | null
          to_seller_id: string | null
        }
        Insert: {
          batch_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          from_holder_type?: Database["public"]["Enums"]["holder_type"] | null
          from_seller_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          source_op_id?: string | null
          source_op_type?: string | null
          to_holder_type?: Database["public"]["Enums"]["holder_type"] | null
          to_seller_id?: string | null
        }
        Update: {
          batch_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          from_holder_type?: Database["public"]["Enums"]["holder_type"] | null
          from_seller_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          product_id?: string
          quantity?: number
          source_op_id?: string | null
          source_op_type?: string | null
          to_holder_type?: Database["public"]["Enums"]["holder_type"] | null
          to_seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "stock_movements_from_seller_id_fkey"
            columns: ["from_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_from_seller_id_fkey"
            columns: ["from_seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_seller_id_fkey"
            columns: ["to_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_seller_id_fkey"
            columns: ["to_seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
    }
    Views: {
      v_business_cash: {
        Row: {
          director_cash: number | null
          in_transit: number | null
          sellers_cash: number | null
          total_business_cash: number | null
        }
        Relationships: []
      }
      v_doctor_activity: {
        Row: {
          doctor_id: string | null
          last_activity_at: string | null
        }
        Insert: {
          doctor_id?: string | null
          last_activity_at?: never
        }
        Update: {
          doctor_id?: string | null
          last_activity_at?: never
        }
        Relationships: []
      }
      v_doctor_credit: {
        Row: {
          credit_balance: number | null
          doctor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_credit_movements_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_credit_movements_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
        ]
      }
      v_profit_summary: {
        Row: {
          approved_expenses: number | null
          cogs: number | null
          gross_profit: number | null
          net_profit: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_quota_progress: {
        Row: {
          collected: number | null
          deviation_pct_snapshot: number | null
          doctor_id: string | null
          goal_amount: number | null
          month_index: number | null
          name_snapshot: string | null
          period_end: string | null
          period_start: string | null
          quota_id: string | null
          quota_month_id: string | null
          seller_id: string | null
          status_color: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quota_months_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "quotas_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      v_realization_status: {
        Row: {
          billed: number | null
          billed_net: number | null
          credit_applied: number | null
          doctor_id: string | null
          is_overdue: boolean | null
          last_payment_date: string | null
          overpaid: number | null
          paid: number | null
          quota_id: string | null
          realization_date: string | null
          realization_id: string | null
          remaining: number | null
          returned: number | null
          seller_id: string | null
          status_color: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realizations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_activity"
            referencedColumns: ["doctor_id"]
          },
          {
            foreignKeyName: "realizations_quota_fk"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      v_sale_economics: {
        Row: {
          cogs: number | null
          revenue: number | null
          sale_id: string | null
        }
        Insert: {
          cogs?: never
          revenue?: never
          sale_id?: string | null
        }
        Update: {
          cogs?: never
          revenue?: never
          sale_id?: string | null
        }
        Relationships: []
      }
      v_seller_cash: {
        Row: {
          cash_balance: number | null
          first_name: string | null
          in_transit: number | null
          last_name: string | null
          seller_color: string | null
          seller_id: string | null
        }
        Relationships: []
      }
      v_stock_cost: {
        Row: {
          cost_value: number | null
          holder_type: Database["public"]["Enums"]["holder_type"] | null
          product_id: string | null
          quantity: number | null
          seller_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      v_stock_on_hand: {
        Row: {
          category: string | null
          consignment_value: number | null
          holder_type: Database["public"]["Enums"]["holder_type"] | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          retail_value: number | null
          seller_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_cash"
            referencedColumns: ["seller_id"]
          },
        ]
      }
    }
    Functions: {
      add_batch: {
        Args: {
          p_arrival_date: string
          p_comment?: string
          p_product: string
          p_qty: number
          p_unit_cost: number
        }
        Returns: string
      }
      add_expense: {
        Args: {
          p_amount: number
          p_category: Database["public"]["Enums"]["expense_category"]
          p_comment?: string
          p_date: string
        }
        Returns: string
      }
      add_payment: {
        Args: {
          p_amount: number
          p_comment?: string
          p_payment_date: string
          p_realization: string
        }
        Returns: string
      }
      apply_doctor_credit: {
        Args: { p_amount: number; p_comment?: string; p_realization: string }
        Returns: undefined
      }
      approve_expense: { Args: { p_id: string }; Returns: undefined }
      close_quota: { Args: { p_id: string }; Returns: undefined }
      confirm_money_transfer: { Args: { p_id: string }; Returns: undefined }
      create_consignment: {
        Args: {
          p_comment: string
          p_date: string
          p_doctor: string
          p_items: Json
          p_quota_id: string
          p_seller: string
        }
        Returns: string
      }
      create_sale: {
        Args: {
          p_comment: string
          p_doctor: string
          p_items: Json
          p_quota_id: string
          p_sale_date: string
          p_seller: string
        }
        Returns: string
      }
      director_topup: {
        Args: {
          p_amount: number
          p_comment?: string
          p_date: string
          p_is_loan: boolean
          p_source: string
        }
        Returns: string
      }
      initiate_money_transfer: {
        Args: { p_amount: number; p_comment?: string }
        Returns: string
      }
      open_quota: {
        Args: {
          p_doctor: string
          p_seller: string
          p_start_date: string
          p_template: string
        }
        Returns: string
      }
      refund_doctor_credit: {
        Args: { p_amount: number; p_comment?: string; p_doctor: string }
        Returns: undefined
      }
      reject_expense: {
        Args: { p_comment?: string; p_id: string }
        Returns: undefined
      }
      reject_money_transfer: {
        Args: { p_comment?: string; p_id: string }
        Returns: undefined
      }
      return_from_doctor: {
        Args: {
          p_comment?: string
          p_qty: number
          p_refund_source?: Database["public"]["Enums"]["refund_source"]
          p_source_item_id: string
          p_source_op_id: string
          p_source_op_type: string
        }
        Returns: string
      }
      return_seller_to_warehouse: {
        Args: { p_comment?: string; p_items: Json; p_seller: string }
        Returns: string
      }
      transfer_to_seller: {
        Args: { p_comment?: string; p_items: Json; p_seller: string }
        Returns: string
      }
    }
    Enums: {
      account_type: "director" | "seller"
      credit_reason:
        | "overpayment_return"
        | "manual_adjustment"
        | "applied_to_consignment"
        | "refunded"
      expense_category:
        | "rent"
        | "salary"
        | "bonus"
        | "assistance"
        | "unexpected"
        | "other"
      expense_status: "pending" | "approved" | "rejected"
      holder_type: "warehouse" | "seller"
      money_direction: "in" | "out"
      money_movement_type:
        | "sale_cash_in"
        | "payment_in"
        | "transfer"
        | "topup"
        | "expense"
        | "refund"
        | "advance_credit"
        | "adjustment"
      price_type: "retail" | "consignment" | "custom" | "free_bonus"
      quota_status: "active" | "closed"
      refund_source: "seller" | "director" | "none"
      return_type:
        | "doctor_return_sale"
        | "doctor_return_consignment"
        | "seller_return_to_warehouse"
      stock_movement_type:
        | "arrival"
        | "transfer_to_seller"
        | "sale"
        | "consignment"
        | "return_doctor_to_seller"
        | "return_seller_to_warehouse"
        | "free_bonus"
        | "adjustment"
      transfer_status: "pending" | "confirmed" | "rejected"
      user_role: "director" | "manager" | "seller"
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
      account_type: ["director", "seller"],
      credit_reason: [
        "overpayment_return",
        "manual_adjustment",
        "applied_to_consignment",
        "refunded",
      ],
      expense_category: [
        "rent",
        "salary",
        "bonus",
        "assistance",
        "unexpected",
        "other",
      ],
      expense_status: ["pending", "approved", "rejected"],
      holder_type: ["warehouse", "seller"],
      money_direction: ["in", "out"],
      money_movement_type: [
        "sale_cash_in",
        "payment_in",
        "transfer",
        "topup",
        "expense",
        "refund",
        "advance_credit",
        "adjustment",
      ],
      price_type: ["retail", "consignment", "custom", "free_bonus"],
      quota_status: ["active", "closed"],
      refund_source: ["seller", "director", "none"],
      return_type: [
        "doctor_return_sale",
        "doctor_return_consignment",
        "seller_return_to_warehouse",
      ],
      stock_movement_type: [
        "arrival",
        "transfer_to_seller",
        "sale",
        "consignment",
        "return_doctor_to_seller",
        "return_seller_to_warehouse",
        "free_bonus",
        "adjustment",
      ],
      transfer_status: ["pending", "confirmed", "rejected"],
      user_role: ["director", "manager", "seller"],
    },
  },
} as const
