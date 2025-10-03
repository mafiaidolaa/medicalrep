// @ts-nocheck
import { supabase } from '../supabase';

// Types for user management
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  department?: string;
  level: number; // Hierarchical level (1 = lowest, 10 = highest)
  permissions: Permission[];
  is_system_role: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  resource: string; // e.g., 'expense_requests', 'users', 'reports'
  action: string; // e.g., 'create', 'read', 'update', 'delete', 'approve'
  conditions?: PermissionCondition[];
  description?: string;
}

export interface PermissionCondition {
  field: string; // e.g., 'department', 'amount', 'status'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains';
  value: any;
  description?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  role: Role;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  department: string;
  position: string;
  region?: string;
  manager_id?: string;
  employee_id?: string;
  phone?: string;
  hire_date?: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  last_login?: string;
  login_count: number;
  roles: UserRole[];
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  language: 'ar' | 'en';
  timezone: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  currency: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  theme: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string;
  user_agent: string;
  location?: {
    country?: string;
    city?: string;
  };
  is_active: boolean;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

export interface SecuritySettings {
  id: string;
  require_mfa: boolean;
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  password_expiry_days?: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  audit_all_actions: boolean;
  require_approval_for_role_changes: boolean;
  created_at: string;
  updated_at: string;
}

class UserManagementService {
  // Role Management
  async createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert(roleData)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logAuditAction(roleData.created_by, 'create', 'role', data.id, undefined, roleData);

      return data;
    } catch (error) {
      console.error('Create role failed:', error);
      return null;
    }
  }

  async updateRole(roleId: string, updates: Partial<Role>, updatedBy: string): Promise<Role | null> {
    try {
      // Get current role for audit
      const { data: currentRole } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      const { data, error } = await supabase
        .from('roles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', roleId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logAuditAction(updatedBy, 'update', 'role', roleId, currentRole, updates);

      return data;
    } catch (error) {
      console.error('Update role failed:', error);
      return null;
    }
  }

  async deleteRole(roleId: string, deletedBy: string): Promise<boolean> {
    try {
      // Check if role is in use
      const { data: usersWithRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (usersWithRole && usersWithRole.length > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // Get role for audit
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      // Log the action
      await this.logAuditAction(deletedBy, 'delete', 'role', roleId, role);

      return true;
    } catch (error) {
      console.error('Delete role failed:', error);
      return false;
    }
  }

  async getRoles(departmentFilter?: string): Promise<Role[]> {
    try {
      let query = supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: true });

      if (departmentFilter) {
        query = query.eq('department', departmentFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get roles failed:', error);
      return [];
    }
  }

  // User Role Assignment
  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: string
  ): Promise<boolean> {
    try {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_active', true)
        .single();

      if (existingRole) {
        throw new Error('User already has this role');
      }

      const userRole = {
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('user_roles')
        .insert(userRole)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logAuditAction(assignedBy, 'assign_role', 'user', userId, undefined, { role_id: roleId });

      return true;
    } catch (error) {
      console.error('Assign role to user failed:', error);
      return false;
    }
  }

  async revokeRoleFromUser(userId: string, roleId: string, revokedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      // Log the action
      await this.logAuditAction(revokedBy, 'revoke_role', 'user', userId, undefined, { role_id: roleId });

      return true;
    } catch (error) {
      console.error('Revoke role from user failed:', error);
      return false;
    }
  }

  // User Management
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          roles:user_roles(
            *,
            role:roles(*)
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        ...data,
        roles: data.roles?.filter((ur: any) => ur.is_active) || [],
      };
    } catch (error) {
      console.error('Get user profile failed:', error);
      return null;
    }
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>,
    updatedBy: string
  ): Promise<UserProfile | null> {
    try {
      // Get current profile for audit
      const currentProfile = await this.getUserProfile(userId);

      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logAuditAction(updatedBy, 'update', 'user', userId, currentProfile, updates);

      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Update user profile failed:', error);
      return null;
    }
  }

  async suspendUser(userId: string, suspendedBy: string, reason?: string): Promise<boolean> {
    try {
      const updates = {
        status: 'suspended' as const,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Deactivate all sessions
      await this.deactivateUserSessions(userId);

      // Log the action
      await this.logAuditAction(suspendedBy, 'suspend', 'user', userId, undefined, { reason });

      return true;
    } catch (error) {
      console.error('Suspend user failed:', error);
      return false;
    }
  }

  async reactivateUser(userId: string, reactivatedBy: string): Promise<boolean> {
    try {
      const updates = {
        status: 'active' as const,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await this.logAuditAction(reactivatedBy, 'reactivate', 'user', userId);

      return true;
    } catch (error) {
      console.error('Reactivate user failed:', error);
      return false;
    }
  }

  // Permission Checking
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile || userProfile.status !== 'active') return false;

      // Check all user roles
      for (const userRole of userProfile.roles) {
        if (!userRole.is_active) continue;
        if (userRole.expires_at && new Date(userRole.expires_at) < new Date()) continue;

        // Check role permissions
        for (const permission of userRole.role.permissions) {
          if (permission.resource === resource && permission.action === action) {
            // Check conditions if any
            if (permission.conditions && permission.conditions.length > 0) {
              const conditionsMet = this.evaluateConditions(permission.conditions, context || {});
              if (conditionsMet) return true;
            } else {
              return true; // No conditions, permission granted
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Check permission failed:', error);
      return false;
    }
  }

  private evaluateConditions(conditions: PermissionCondition[], context: Record<string, any>): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'not_equals':
          return contextValue !== condition.value;
        case 'greater_than':
          return Number(contextValue) > Number(condition.value);
        case 'less_than':
          return Number(contextValue) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        case 'contains':
          return String(contextValue).toLowerCase().includes(String(condition.value).toLowerCase());
        default:
          return false;
      }
    });
  }

  // Session Management
  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<UserSession | null> {
    try {
      const securitySettings = await this.getSecuritySettings();
      
      // Check concurrent sessions limit
      if (securitySettings.max_concurrent_sessions > 0) {
        const { data: activeSessions } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (activeSessions && activeSessions.length >= securitySettings.max_concurrent_sessions) {
          // Deactivate oldest session
          await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1);
        }
      }

      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + securitySettings.session_timeout_minutes * 60 * 1000);

      const session = {
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true,
        last_activity: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await supabase
        .from('user_sessions')
        .insert(session)
        .select()
        .single();

      if (error) throw error;

      // Update user login stats
      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_count: supabase.sql`login_count + 1`,
        })
        .eq('id', userId);

      // Log the action
      await this.logAuditAction(userId, 'login', 'session', data.id, undefined, { ip_address: ipAddress });

      return data;
    } catch (error) {
      console.error('Create session failed:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('is_active', true);

      return !error;
    } catch (error) {
      console.error('Update session activity failed:', error);
      return false;
    }
  }

  async deactivateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      return !error;
    } catch (error) {
      console.error('Deactivate session failed:', error);
      return false;
    }
  }

  async deactivateUserSessions(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Deactivate user sessions failed:', error);
      return false;
    }
  }

  // Audit Logging
  async logAuditAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const securitySettings = await this.getSecuritySettings();
      if (!securitySettings.audit_all_actions && !['login', 'logout', 'assign_role', 'revoke_role'].includes(action)) {
        return;
      }

      const auditLog: Omit<AuditLog, 'id'> = {
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
      };

      await supabase.from('audit_logs').insert(auditLog);
    } catch (error) {
      console.error('Log audit action failed:', error);
    }
  }

  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
      if (filters.dateFrom) query = query.gte('timestamp', filters.dateFrom);
      if (filters.dateTo) query = query.lte('timestamp', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get audit logs failed:', error);
      return [];
    }
  }

  // Security Settings
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return await this.createDefaultSecuritySettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get security settings failed:', error);
      return await this.createDefaultSecuritySettings();
    }
  }

  async createDefaultSecuritySettings(): Promise<SecuritySettings> {
    const defaultSettings = {
      require_mfa: false,
      session_timeout_minutes: 480, // 8 hours
      max_concurrent_sessions: 3,
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_symbols: false,
      password_expiry_days: 90,
      max_login_attempts: 5,
      lockout_duration_minutes: 15,
      audit_all_actions: true,
      require_approval_for_role_changes: true,
    };

    const { data, error } = await supabase
      .from('security_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error('Create default security settings failed:', error);
      return defaultSettings as SecuritySettings;
    }

    return data;
  }

  async updateSecuritySettings(updates: Partial<SecuritySettings>): Promise<SecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update security settings failed:', error);
      return null;
    }
  }

  // Utility Functions
  private generateSessionToken(): string {
    return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  }

  // Advanced User Queries
  async getUsersByDepartment(department: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          roles:user_roles(
            *,
            role:roles(*)
          )
        `)
        .eq('department', department)
        .eq('status', 'active');

      if (error) throw error;

      return (data || []).map(user => ({
        ...user,
        roles: user.roles?.filter((ur: any) => ur.is_active) || [],
      }));
    } catch (error) {
      console.error('Get users by department failed:', error);
      return [];
    }
  }

  async getUsersByRole(roleName: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          user:users(*),
          role:roles(*)
        `)
        .eq('role.name', roleName)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map((userRole: any) => ({
        ...userRole.user,
        roles: [{ ...userRole, role: userRole.role }],
      }));
    } catch (error) {
      console.error('Get users by role failed:', error);
      return [];
    }
  }

  async getInactiveUsers(days: number = 30): Promise<UserProfile[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .lt('last_login', cutoffDate.toISOString())
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get inactive users failed:', error);
      return [];
    }
  }

  // Department-based permissions
  async getUsersInDepartmentHierarchy(userId: string): Promise<UserProfile[]> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) return [];

      // Get all users in the same department and sub-departments
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`department.eq.${user.department},manager_id.eq.${userId}`)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get users in department hierarchy failed:', error);
      return [];
    }
  }

  // Bulk operations
  async bulkAssignRole(userIds: string[], roleId: string, assignedBy: string): Promise<{
    successful: string[];
    failed: { userId: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      try {
        const success = await this.assignRoleToUser(userId, roleId, assignedBy);
        if (success) {
          successful.push(userId);
        } else {
          failed.push({ userId, error: 'Assignment failed' });
        }
      } catch (error) {
        failed.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { successful, failed };
  }

  async bulkUpdateUsers(
    updates: Array<{ userId: string; data: Partial<UserProfile> }>,
    updatedBy: string
  ): Promise<{
    successful: string[];
    failed: { userId: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const { userId, data } of updates) {
      try {
        const result = await this.updateUserProfile(userId, data, updatedBy);
        if (result) {
          successful.push(userId);
        } else {
          failed.push({ userId, error: 'Update failed' });
        }
      } catch (error) {
        failed.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { successful, failed };
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;