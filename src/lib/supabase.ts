import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side client for admin operations (if needed)
export const createServerSupabaseClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    const isDev = process.env.NODE_ENV !== 'production'
    // In development, gracefully fall back to anon key to avoid hard crashes
    if (isDev && supabaseAnonKey) {
      console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key for development. Some API routes may be limited by RLS.')
      return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
    console.error('Make sure to restart your development server after updating .env.local')
    throw new Error('Missing Supabase service role key')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
