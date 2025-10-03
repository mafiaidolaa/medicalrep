/**
 * Server-side Authentication Utilities
 * دوال المساعدة للمصادقة في جانب الخادم
 */

// @ts-nocheck

import { cookies } from 'next/headers';
import { createServerSupabaseClient } from './supabase';

export interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
}

/**
 * الحصول على المستخدم الحالي من جانب الخادم
 * Get current user from server side
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('No authenticated user found');
      return null;
    }

    return user as User;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

/**
 * التحقق من صلاحيات المستخدم
 * Check user permissions
 */
export async function checkUserPermissions(
  requiredPermissions: string[]
): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;

    // في النسخة الحالية، جميع المستخدمين لديهم صلاحيات كاملة
    // In current version, all users have full permissions
    // TODO: Implement proper permission checking
    return true;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
}

/**
 * التحقق من دور المستخدم
 * Check user role
 */
export async function checkUserRole(requiredRole: string): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;

    // في النسخة الحالية، جميع المستخدمين لديهم دور admin
    // In current version, all users have admin role
    // TODO: Implement proper role checking
    return true;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * إنشاء جلسة مصادقة جديدة
 * Create new auth session
 */
export async function createAuthSession(email: string, password: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating auth session:', error);
    throw error;
  }
}

/**
 * إنهاء جلسة المصادقة
 * Sign out user
 */
export async function signOut() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * التحقق من صحة الجلسة
 * Validate session
 */
export async function validateSession(): Promise<boolean> {
  try {
    const user = await getServerUser();
    return user !== null;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}