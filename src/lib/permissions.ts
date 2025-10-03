

// Centralized definition of modules
export const modules: { [key: string]: string } = {
    dashboard: 'nav.dashboard',
    clinics: 'nav.clinics',
    visits: 'nav.visits',
    plans: 'nav.plans',
    orders: 'nav.orders',
    stock: 'nav.stock',
    accounting: 'nav.accounting',
    expenses: 'nav.expenses',
    reports: 'nav.reports',
    managers: 'nav.managers',
    notifications: 'nav.notifications',
    users: 'nav.users',
    'activity-log': 'nav.activity_log',
    // Admin-only module for viewing soft-deleted items
    trash: 'nav.trash',
    settings: 'nav.settings',
};

// Type definition for the entire roles configuration object
export interface RolesConfig {
    [key: string]: {
        name: string;
        permissions: string[];
    };
}

// Default roles and permissions configuration
export const defaultRolesConfig: RolesConfig = {
    admin: { name: 'roles.admin', permissions: Object.keys(modules) },
    medical_rep: { name: 'roles.medical_rep', permissions: ['dashboard', 'clinics', 'visits', 'orders', 'notifications', 'activity-log', 'expenses'] },
    manager: { name: 'roles.manager', permissions: ['dashboard', 'clinics', 'visits', 'plans', 'orders', 'stock', 'reports', 'managers', 'notifications', 'users', 'activity-log', 'expenses'] },
    area_manager: { name: 'roles.area_manager', permissions: ['dashboard', 'clinics', 'visits', 'plans', 'orders', 'stock', 'reports', 'managers', 'notifications', 'users', 'activity-log', 'expenses'] },
    line_manager: { name: 'roles.line_manager', permissions: ['dashboard', 'clinics', 'visits', 'plans', 'orders', 'stock', 'reports', 'managers', 'notifications', 'users', 'activity-log', 'expenses'] },
    warehouse_manager: { name: 'roles.warehouse_manager', permissions: ['stock'] },
    accountant: { name: 'roles.accountant', permissions: ['accounting', 'reports', 'expenses'] },
    gm: { name: 'roles.gm', permissions: Object.keys(modules) },
    // Add common basic roles
    user: { name: 'roles.user', permissions: ['dashboard', 'clinics', 'visits', 'expenses', 'notifications', 'activity-log'] },
    demo: { name: 'roles.demo', permissions: ['dashboard', 'clinics', 'visits', 'expenses'] },
    test_user: { name: 'roles.test_user', permissions: ['dashboard', 'clinics', 'visits', 'expenses'] },
};

/**
 * Checks if a user with a given role has permission for a specific module.
 * @param role The role of the user (e.g., 'medical_rep').
 * @param module The module to check permission for (e.g., 'clinics').
 * @param rolesConfig The roles configuration object.
 * @returns `true` if the user has permission, otherwise `false`.
 */
export const hasPermission = (role: string, module: string, rolesConfig: RolesConfig): boolean => {
    if (!role) {
        return false;
    }
    
    const roleKey = role.toLowerCase();

    // Enforce strict access for Activity Log: only admin and manager
    if (module === 'activity-log') {
        return roleKey === 'admin' || roleKey === 'manager';
    }

    const roleConfig = rolesConfig[roleKey];
    
    if (!roleConfig) {
        console.warn(`Permission check failed: Role "${roleKey}" not found in config.`);
        // Safe default: allow Expenses for any authenticated role to meet business requirement
        if (module === 'expenses') return true;
        return false;
    }
    
    // Always allow expenses across roles, even if not explicitly configured
    if (module === 'expenses') return true;

    return roleConfig.permissions.includes(module);
};
