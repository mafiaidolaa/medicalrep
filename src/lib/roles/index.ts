// @ts-nocheck
import { supabase } from '../supabase';

// Types for advanced roles and permissions system
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  department_id?: string;
  is_system_role: boolean;
  permissions: Permission[];
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  scope: 'global' | 'department' | 'own' | 'custom';
  description?: string;
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with';
  value: any;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  department_id?: string;
  conditions?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  conditions?: PermissionCondition[];
  created_at: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  policy_type: 'authentication' | 'authorization' | 'data_access' | 'session' | 'audit';
  rules: SecurityRule[];
  is_enabled: boolean;
  applies_to: string[];
  created_at: string;
  updated_at: string;
}

export interface SecurityRule {
  condition: string;
  action: 'allow' | 'deny' | 'log' | 'warn' | 'require_approval';
  parameters?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  session_id?: string;
  risk_score?: number;
  status: 'success' | 'failed' | 'blocked';
  details?: string;
  timestamp: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  manager_id?: string;
  cost_center?: string;
  budget_limit?: number;
  is_active: boolean;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  employee_id?: string;
  department_id?: string;
  manager_id?: string;
  job_title?: string;
  level: number;
  hire_date?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences?: UserPreferences;
  security_settings?: UserSecuritySettings;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  date_format: string;
  currency: string;
  theme: string;
  notifications: NotificationPreferences;
  dashboard_widgets: string[];
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  in_app: boolean;
  digest_frequency: 'immediate' | 'daily' | 'weekly';
  categories: Record<string, boolean>;
}

export interface UserSecuritySettings {
  mfa_enabled: boolean;
  mfa_methods: string[];
  password_expires_at?: string;
  login_attempts: number;
  locked_until?: string;
  trusted_devices: TrustedDevice[];
  security_questions?: SecurityQuestion[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  device_type: string;
  fingerprint: string;
  last_used: string;
  is_active: boolean;
}

export interface SecurityQuestion {
  question: string;
  answer_hash: string;
}

class RoleManagementService {
  // Role Management
  async getRoles(filters?: {
    department_id?: string;
    is_system_role?: boolean;
    level?: number;
  }): Promise<Role[]> {
    try {
      let query = supabase
        .from('roles')
        .select(`
          *,
          permissions:role_permissions(
            permission:permissions(*)
          ),
          department:departments(name, description)
        `);

      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id);
      }
      if (filters?.is_system_role !== undefined) {
        query = query.eq('is_system_role', filters.is_system_role);
      }
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }

      const { data, error } = await query.order('level', { ascending: true });
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get roles failed:', error);
      return [];
    }
  }

  async createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert(role)
        .select()
        .single();

      if (error) throw error;
      
      // Add permissions to role
      if (role.permissions && role.permissions.length > 0) {
        await this.assignPermissionsToRole(data.id, role.permissions.map(p => p.id));
      }

      return data;
    } catch (error) {
      console.error('Create role failed:', error);
      return null;
    }
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', roleId)
        .select()
        .single();

      if (error) throw error;
      
      // Update permissions if provided
      if (updates.permissions) {
        await this.setRolePermissions(roleId, updates.permissions.map(p => p.id));
      }

      return data;
    } catch (error) {
      console.error('Update role failed:', error);
      return null;
    }
  }

  async deleteRole(roleId: string): Promise<boolean> {
    try {
      // Check if role is being used
      const { data: userRoles, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role_id', roleId)
        .eq('is_active', true)
        .limit(1);

      if (checkError) throw checkError;

      if (userRoles && userRoles.length > 0) {
        throw new Error('Cannot delete role that is currently assigned to users');
      }

      // Delete role permissions first
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Delete role
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete role failed:', error);
      return false;
    }
  }

  // Permission Management
  async getPermissions(resource?: string): Promise<Permission[]> {
    try {
      let query = supabase.from('permissions').select('*');
      
      if (resource) {
        query = query.eq('resource', resource);
      }

      const { data, error } = await query.order('resource', { ascending: true });
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get permissions failed:', error);
      return [];
    }
  }

  async createPermission(permission: Omit<Permission, 'id'>): Promise<Permission | null> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .insert(permission)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create permission failed:', error);
      return null;
    }
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<boolean> {
    try {
      const rolePermissions = permissionIds.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId
      }));

      const { error } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Assign permissions to role failed:', error);
      return false;
    }
  }

  async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .in('permission_id', permissionIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Remove permissions from role failed:', error);
      return false;
    }
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<boolean> {
    try {
      // Remove all existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Add new permissions
      if (permissionIds.length > 0) {
        await this.assignPermissionsToRole(roleId, permissionIds);
      }

      return true;
    } catch (error) {
      console.error('Set role permissions failed:', error);
      return false;
    }
  }

  // User Role Assignment
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(*),
          department:departments(name),
          assigned_by_user:user_profiles!assigned_by(
            full_name
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user roles failed:', error);
      return [];
    }
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    options?: {
      department_id?: string;
      expires_at?: string;
      conditions?: Record<string, any>;
    }
  ): Promise<UserRole | null> {
    try {
      const userRole: Omit<UserRole, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        is_active: true,
        ...options
      };

      const { data, error } = await supabase
        .from('user_roles')
        .insert(userRole)
        .select()
        .single();

      if (error) throw error;
      
      // Log the assignment
      await this.logAuditEvent({
        user_id: assignedBy,
        action: 'role_assigned',
        resource: 'user_roles',
        resource_id: data.id,
        new_values: { user_id: userId, role_id: roleId },
        status: 'success'
      });

      return data;
    } catch (error) {
      console.error('Assign role to user failed:', error);
      return null;
    }
  }

  async removeRoleFromUser(userId: string, roleId: string, removedBy: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) throw error;

      // Log the removal
      await this.logAuditEvent({
        user_id: removedBy,
        action: 'role_removed',
        resource: 'user_roles',
        resource_id: data.id,
        old_values: { user_id: userId, role_id: roleId, is_active: true },
        new_values: { is_active: false },
        status: 'success'
      });

      return true;
    } catch (error) {
      console.error('Remove role from user failed:', error);
      return false;
    }
  }

  // Permission Checking
  async checkUserPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_permissions_view')
        .select('*')
        .eq('user_id', userId)
        .eq('resource', resource)
        .eq('action', action)
        .eq('is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) return false;

      // Check conditions if any
      for (const permission of data) {
        if (this.evaluatePermissionConditions(permission.conditions, context)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Check user permission failed:', error);
      return false;
    }
  }

  private evaluatePermissionConditions(
    conditions?: PermissionCondition[],
    context?: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    if (!context) return false;

    return conditions.every(condition => {
      const contextValue = context[condition.field];
      
      switch (condition.operator) {
        case 'eq':
          return contextValue === condition.value;
        case 'ne':
          return contextValue !== condition.value;
        case 'gt':
          return contextValue > condition.value;
        case 'gte':
          return contextValue >= condition.value;
        case 'lt':
          return contextValue < condition.value;
        case 'lte':
          return contextValue <= condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        case 'contains':
          return String(contextValue).includes(String(condition.value));
        case 'starts_with':
          return String(contextValue).startsWith(String(condition.value));
        default:
          return false;
      }
    });
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from('user_permissions_view')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user permissions failed:', error);
      return [];
    }
  }

  // Department Management
  async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:user_profiles!manager_id(
            full_name,
            email
          ),
          parent:departments!parent_id(
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get departments failed:', error);
      return [];
    }
  }

  async createDepartment(department: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<Department | null> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert(department)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create department failed:', error);
      return null;
    }
  }

  async updateDepartment(departmentId: string, updates: Partial<Department>): Promise<Department | null> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', departmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update department failed:', error);
      return null;
    }
  }

  // Security Policies
  async getSecurityPolicies(): Promise<SecurityPolicy[]> {
    try {
      const { data, error } = await supabase
        .from('security_policies')
        .select('*')
        .eq('is_enabled', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get security policies failed:', error);
      return [];
    }
  }

  async createSecurityPolicy(policy: Omit<SecurityPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<SecurityPolicy | null> {
    try {
      const { data, error } = await supabase
        .from('security_policies')
        .insert(policy)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create security policy failed:', error);
      return null;
    }
  }

  async updateSecurityPolicy(policyId: string, updates: Partial<SecurityPolicy>): Promise<SecurityPolicy | null> {
    try {
      const { data, error } = await supabase
        .from('security_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update security policy failed:', error);
      return null;
    }
  }

  // Audit Logging
  async logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog | null> {
    try {
      const auditEvent: Omit<AuditLog, 'id'> = {
        ...event,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditEvent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Log audit event failed:', error);
      return null;
    }
  }

  async getAuditLogs(filters?: {
    user_id?: string;
    resource?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AuditLog[]; total: number }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.resource) {
        query = query.eq('resource', filters.resource);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.start_date) {
        query = query.gte('timestamp', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('timestamp', filters.end_date);
      }

      query = query.order('timestamp', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Get audit logs failed:', error);
      return { data: [], total: 0 };
    }
  }

  // User Profile Management
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          department:departments(name, description),
          manager:user_profiles!manager_id(
            full_name,
            email
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get user profile failed:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update user profile failed:', error);
      return null;
    }
  }

  // Utility Methods
  async getRoleHierarchy(): Promise<Role[]> {
    const roles = await this.getRoles();
    return this.buildRoleHierarchy(roles);
  }

  private buildRoleHierarchy(roles: Role[]): Role[] {
    return roles.sort((a, b) => a.level - b.level);
  }

  async validateRoleAssignment(userId: string, roleId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // Get user's current roles
      const userRoles = await this.getUserRoles(userId);
const currentLevels = userRoles.map(ur => (ur as any).role?.level || 0);
      
      // Get the role being assigned
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (!role) {
        return { valid: false, message: 'Role not found' };
      }

      // Check if user already has this role
      if (userRoles.some(ur => ur.role_id === roleId)) {
        return { valid: false, message: 'User already has this role' };
      }

      // Check role level restrictions
      const maxCurrentLevel = Math.max(...currentLevels, 0);
      if (role.level > maxCurrentLevel + 1) {
        return { valid: false, message: 'Role level too high for current user level' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Validate role assignment failed:', error);
      return { valid: false, message: 'Validation failed' };
    }
  }

  // Bulk Operations
  async bulkAssignRoles(assignments: Array<{
    user_id: string;
    role_id: string;
    department_id?: string;
  }>, assignedBy: string): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const assignment of assignments) {
      try {
        const validation = await this.validateRoleAssignment(assignment.user_id, assignment.role_id);
        if (!validation.valid) {
          errors.push(`User ${assignment.user_id}: ${validation.message}`);
          failed++;
          continue;
        }

        const result = await this.assignRoleToUser(
          assignment.user_id,
          assignment.role_id,
          assignedBy,
          { department_id: assignment.department_id }
        );

        if (result) {
          success++;
        } else {
          failed++;
          errors.push(`User ${assignment.user_id}: Assignment failed`);
        }
      } catch (error) {
        failed++;
        errors.push(`User ${assignment.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }
}

export const roleService = new RoleManagementService();
export default roleService;