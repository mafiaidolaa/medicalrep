// Supabase Type Overrides - حل شامل لمشاكل الأنواع

declare global {
  namespace Database {
    interface Schema {
      public: {
        Tables: {
          activity_log: {
            Row: any;
            Insert: any;
            Update: any;
          };
          activity_logs: {
            Row: any;
            Insert: any;
            Update: any;
          };
          expense_categories: {
            Row: any;
            Insert: any;
            Update: any;
          };
          profiles: {
            Row: any;
            Insert: any;
            Update: any;
          };
          users: {
            Row: any;
            Insert: any;
            Update: any;
          };
          clinics: {
            Row: any;
            Insert: any;
            Update: any;
          };
          visits: {
            Row: any;
            Insert: any;
            Update: any;
          };
          orders: {
            Row: any;
            Insert: any;
            Update: any;
          };
          collections: {
            Row: any;
            Insert: any;
            Update: any;
          };
          products: {
            Row: any;
            Insert: any;
            Update: any;
          };
          expenses: {
            Row: any;
            Insert: any;
            Update: any;
          };
        };
        Views: {
          [key: string]: {
            Row: any;
            Insert?: never;
            Update?: never;
          };
        };
        Functions: {
          [key: string]: {
            Args: any;
            Returns: any;
          };
        };
      };
    }
  }
}

// Supabase Client Type Override
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from(table: string): any;
    rpc(fn: string, params?: any): any;
  }
}

export {};