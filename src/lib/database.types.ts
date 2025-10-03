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
      users: {
        Row: {
          id: string
          full_name: string
          username: string
          email: string
          role: 'admin' | 'medical_rep' | 'manager' | 'accountant'
          hire_date: string
          password: string
          area?: string
          line?: string
          manager_id?: string
          primary_phone: string
          whatsapp_phone?: string
          alt_phone?: string
          profile_picture?: string
          sales_target?: number
          visits_target?: number
          is_active?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          username: string
          email: string
          role: 'admin' | 'medical_rep' | 'manager' | 'accountant'
          hire_date: string
          password: string
          area?: string
          line?: string
          manager_id?: string
          primary_phone: string
          whatsapp_phone?: string
          alt_phone?: string
          profile_picture?: string
          sales_target?: number
          visits_target?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          username?: string
          email?: string
          role?: 'admin' | 'medical_rep' | 'manager' | 'accountant'
          hire_date?: string
          password?: string
          area?: string
          line?: string
          manager_id?: string
          primary_phone?: string
          whatsapp_phone?: string
          alt_phone?: string
          profile_picture?: string
          sales_target?: number
          visits_target?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clinics: {
        Row: {
          id: string
          name: string
          doctor_name: string
          address: string
          lat: number
          lng: number
          registered_at: string
          clinic_phone?: string
          doctor_phone?: string
          area: string
          line: string
          classification: 'A' | 'B' | 'C'
          credit_status: 'green' | 'yellow' | 'red'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          doctor_name: string
          address: string
          lat: number
          lng: number
          registered_at: string
          clinic_phone?: string
          doctor_phone?: string
          area: string
          line: string
          classification: 'A' | 'B' | 'C'
          credit_status: 'green' | 'yellow' | 'red'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          doctor_name?: string
          address?: string
          lat?: number
          lng?: number
          registered_at?: string
          clinic_phone?: string
          doctor_phone?: string
          area?: string
          line?: string
          classification?: 'A' | 'B' | 'C'
          credit_status?: 'green' | 'yellow' | 'red'
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category?: string  // Made optional to handle missing DB column
          price: number
          image_url?: string
          stock: number
          average_daily_usage: number
          line: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string  // Made optional to handle missing DB column
          price: number
          image_url?: string
          stock: number
          average_daily_usage: number
          line: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          price?: number
          image_url?: string
          stock?: number
          average_daily_usage?: number
          line?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          clinic_id: string
          representative_id: string
          items: Json
          total_amount: number
          status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          order_date: string
          due_date?: string
          delivery_date?: string
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          representative_id: string
          items: Json
          total_amount: number
          status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          order_date: string
          due_date?: string
          delivery_date?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          representative_id?: string
          items?: Json
          total_amount?: number
          status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          order_date?: string
          due_date?: string
          delivery_date?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          clinic_id: string
          representative_id: string
          visit_date: string
          purpose: string
          notes?: string
          outcome?: string
          next_visit_date?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          representative_id: string
          visit_date: string
          purpose: string
          notes?: string
          outcome?: string
          next_visit_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          representative_id?: string
          visit_date?: string
          purpose?: string
          notes?: string
          outcome?: string
          next_visit_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          clinic_id: string
          representative_id: string
          order_id?: string
          amount: number
          collection_date: string
          payment_method: 'cash' | 'check' | 'bank_transfer'
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          representative_id: string
          order_id?: string
          amount: number
          collection_date: string
          payment_method: 'cash' | 'check' | 'bank_transfer'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          representative_id?: string
          order_id?: string
          amount?: number
          collection_date?: string
          payment_method?: 'cash' | 'check' | 'bank_transfer'
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      plan_tasks: {
        Row: {
          id: string
          title: string
          description?: string
          assigned_to: string
          due_date: string
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
          clinic_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          assigned_to: string
          due_date: string
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
          clinic_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          assigned_to?: string
          due_date?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
          clinic_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          changes?: Json
          timestamp: string
          created_at: string
          updated_at?: string
          // Enhanced fields
          title?: string
          details?: string
          type: string
          is_success: boolean
          failure_reason?: string
          // Location Data
          ip_address?: string
          real_ip?: string
          lat?: number
          lng?: number
          location_name?: string
          country?: string
          city?: string
          // Device & Browser Info
          user_agent?: string
          device?: string
          browser?: string
          browser_version?: string
          os?: string
          // Security Data
          attempted_username?: string
          attempted_password_hash?: string
          session_id?: string
          risk_score?: number
          // Additional Metadata
          duration_ms?: number
          referrer?: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          changes?: Json
          timestamp: string
          created_at?: string
          updated_at?: string
          // Enhanced fields
          title?: string
          details?: string
          type?: string
          is_success?: boolean
          failure_reason?: string
          // Location Data
          ip_address?: string
          real_ip?: string
          lat?: number
          lng?: number
          location_name?: string
          country?: string
          city?: string
          // Device & Browser Info
          user_agent?: string
          device?: string
          browser?: string
          browser_version?: string
          os?: string
          // Security Data
          attempted_username?: string
          attempted_password_hash?: string
          session_id?: string
          risk_score?: number
          // Additional Metadata
          duration_ms?: number
          referrer?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          changes?: Json
          timestamp?: string
          created_at?: string
          updated_at?: string
          // Enhanced fields
          title?: string
          details?: string
          type?: string
          is_success?: boolean
          failure_reason?: string
          // Location Data
          ip_address?: string
          real_ip?: string
          lat?: number
          lng?: number
          location_name?: string
          country?: string
          city?: string
          // Device & Browser Info
          user_agent?: string
          device?: string
          browser?: string
          browser_version?: string
          os?: string
          // Security Data
          attempted_username?: string
          attempted_password_hash?: string
          session_id?: string
          risk_score?: number
          // Additional Metadata
          duration_ms?: number
          referrer?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'error' | 'success'
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'error' | 'success'
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'error' | 'success'
          read?: boolean
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          client_name: string
          clinic_id?: string
          amount: number
          status: 'paid' | 'pending' | 'overdue'
          invoice_date: string
          due_date: string
          description?: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          client_name: string
          clinic_id?: string
          amount: number
          status?: 'paid' | 'pending' | 'overdue'
          invoice_date: string
          due_date: string
          description?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          client_name?: string
          clinic_id?: string
          amount?: number
          status?: 'paid' | 'pending' | 'overdue'
          invoice_date?: string
          due_date?: string
          description?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      debts: {
        Row: {
          id: string
          client_name: string
          clinic_id?: string
          amount: number
          due_date: string
          status: 'current' | 'overdue' | 'critical'
          invoice_number?: string
          notes?: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_name: string
          clinic_id?: string
          amount: number
          due_date: string
          status?: 'current' | 'overdue' | 'critical'
          invoice_number?: string
          notes?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_name?: string
          clinic_id?: string
          amount?: number
          due_date?: string
          status?: 'current' | 'overdue' | 'critical'
          invoice_number?: string
          notes?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category: string
          expense_date: string
          status: 'approved' | 'pending' | 'rejected'
          notes?: string
          receipt_url?: string
          created_by: string
          approved_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category: string
          expense_date: string
          status?: 'approved' | 'pending' | 'rejected'
          notes?: string
          receipt_url?: string
          created_by: string
          approved_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          category?: string
          expense_date?: string
          status?: 'approved' | 'pending' | 'rejected'
          notes?: string
          receipt_url?: string
          created_by?: string
          approved_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      product_details: {
        Row: {
          product_id: string
          sku?: string
          unit?: string
          brand?: string
          supplier?: string
          barcode?: string
          min_stock?: number
          max_stock?: number
          status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock'
          notes?: string
          meta?: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          product_id: string
          sku?: string
          unit?: string
          brand?: string
          supplier?: string
          barcode?: string
          min_stock?: number
          max_stock?: number
          status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock'
          notes?: string
          meta?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          sku?: string
          unit?: string
          brand?: string
          supplier?: string
          barcode?: string
          min_stock?: number
          max_stock?: number
          status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock'
          notes?: string
          meta?: Json
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          category: string
          setting_key: string
          setting_value: Json
          description?: string
          is_enabled: boolean
          created_at: string
          updated_at: string
          created_by?: string
          updated_by?: string
        }
        Insert: {
          id?: string
          category: string
          setting_key: string
          setting_value: Json
          description?: string
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
        Update: {
          id?: string
          category?: string
          setting_key?: string
          setting_value?: Json
          description?: string
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
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