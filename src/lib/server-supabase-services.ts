import { createServerSupabaseClient } from './supabase'
import type { User } from './types'
import type { Database } from './database.types'

// Server-side only functions that require service role access
export const getUserByUsernameServer = async (usernameOrEmail: string): Promise<User | null> => {
  try {
    // Use service role key for authentication operations to bypass RLS
    const serverSupabase = createServerSupabaseClient()
    
    // Try to find user by email first, then by username if exists
    let data, error;
    
    // First try email
    const emailResult = await serverSupabase
      .from('users')
      .select('*')
      .eq('email', usernameOrEmail)
      .maybeSingle();
      
    if (emailResult.data) {
      data = emailResult.data;
      error = emailResult.error;
    } else {
      // If not found by email, try username (if column exists)
      const usernameResult = await serverSupabase
        .from('users')
        .select('*')
        .eq('username', usernameOrEmail)
        .maybeSingle();
      data = usernameResult.data;
      error = usernameResult.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return null // User not found
      }
      console.error('Error fetching user:', error.message)
      return null
    }

    if (!data) return null

    // Transform user data
    return {
      id: data.id,
      fullName: data.full_name,
      username: data.username || data.email, // Use username or email as fallback
      email: data.email,
      role: data.role as any,
      hireDate: data.created_at, // Use created_at as hire_date
      password: data.password_hash, // Use password_hash field
      area: data.area || null,
      line: data.line || null,
      primaryPhone: data.phone || null, // Map phone field
      whatsappPhone: data.phone || null, // Use same phone for whatsapp
      altPhone: null, // Not available in current schema
      profilePicture: null, // Not available in current schema
      salesTarget: null, // Not available in current schema
      visitsTarget: null, // Not available in current schema
    }
  } catch (error) {
    console.error('Error in getUserByUsernameServer:', error)
    return null
  }
}

export const addUserServer = async (user: User): Promise<void> => {
  const serverSupabase = createServerSupabaseClient()
  
  const dbUser = {
    id: user.id,
    full_name: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    hire_date: user.hireDate || new Date().toISOString(),
    password: user.password || '',
    area: user.area,
    line: user.line,
    primary_phone: user.primaryPhone || '',
    whatsapp_phone: user.whatsappPhone,
    alt_phone: user.altPhone,
    profile_picture: user.profilePicture,
    sales_target: user.salesTarget,
    visits_target: user.visitsTarget,
  }

  const { error } = await (serverSupabase as any)
    .from('users')
    .insert(dbUser)

  if (error) {
    throw new Error(`Error adding user: ${error.message}`)
  }
}