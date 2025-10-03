"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, User, Plus, Edit, Trash2, Search, Key, UserCheck, Settings, Eye, EyeOff, Crown } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  color: string;
  priority: number; // Higher number = higher priority
}

interface Permission {
  module: string;
  actions: string[];
}

interface UserRole {
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: string;
  areas: string[];
  lines: string[];
  isActive: boolean;
}

const ROLE_COLORS = [
  '#EF4444', // red for admin
  '#F59E0B', // orange for gm  
  '#3B82F6', // blue for manager
  '#10B981', // green for medical_rep
  '#8B5CF6', // purple for accountant
  '#6B7280'  // gray for user
];

const SYSTEM_MODULES = [
  { id: 'dashboard', name: 'لوحة المعلومات', actions: ['view'] },
  { id: 'users', name: 'إدارة المستخدمين', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'clinics', name: 'إدارة العيادات', actions: ['view', 'create', 'edit', 'delete', 'register'] },
  { id: 'visits', name: 'إدارة الزيارات', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'accounting', name: 'المحاسبة', actions: ['view', 'create', 'edit', 'delete', 'reports'] },
  { id: 'reports', name: 'التقارير', actions: ['view', 'export', 'advanced'] },
  { id: 'settings', name: 'الإعدادات', actions: ['view', 'edit'] },
  { id: 'plans', name: 'الخطط', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'stock', name: 'إدارة المخزون', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'expenses', name: 'إدارة النفقات', actions: ['view', 'create', 'edit', 'delete', 'reports'] },
  { id: 'notifications', name: 'الإشعارات', actions: ['view', 'send'] }
];

const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'admin',
    displayName: 'مدير النظام',
    description: 'صلاحيات كاملة لجميع أجزاء النظام',
    color: ROLE_COLORS[0],
    priority: 100,
    permissions: SYSTEM_MODULES.map(module => ({ module: module.id, actions: module.actions }))
  },
  {
    id: 'gm',
    name: 'gm',
    displayName: 'مدير عام',
    description: 'صلاحيات إدارية شاملة',
    color: ROLE_COLORS[1],
    priority: 90,
    permissions: SYSTEM_MODULES.map(module => ({ module: module.id, actions: module.actions }))
  },
  {
    id: 'manager',
    name: 'manager',
    displayName: 'مدير منطقة',
    description: 'إدارة العمليات في المنطقة المحددة',
    color: ROLE_COLORS[2],
    priority: 70,
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'clinics', actions: ['view', 'create', 'edit', 'register'] },
      { module: 'visits', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'reports', actions: ['view', 'export'] },
      { module: 'plans', actions: ['view', 'create', 'edit'] },
      { module: 'users', actions: ['view'] },
      { module: 'expenses', actions: ['view', 'create', 'edit', 'reports'] }
    ]
  },
  {
    id: 'medical_rep',
    name: 'medical_rep',
    displayName: 'مندوب طبي',
    description: 'زيارات العيادات وإدارة العلاقات',
    color: ROLE_COLORS[3],
    priority: 50,
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'clinics', actions: ['view', 'register'] },
      { module: 'visits', actions: ['view', 'create', 'edit'] },
      { module: 'plans', actions: ['view'] },
      { module: 'notifications', actions: ['view'] },
      { module: 'expenses', actions: ['view', 'create'] }
    ]
  },
  {
    id: 'accountant',
    name: 'accountant',
    displayName: 'محاسب',
    description: 'إدارة العمليات المالية والتقارير',
    color: ROLE_COLORS[4],
    priority: 60,
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'accounting', actions: ['view', 'create', 'edit', 'delete', 'reports'] },
      { module: 'reports', actions: ['view', 'export', 'advanced'] },
      { module: 'clinics', actions: ['view'] },
      { module: 'stock', actions: ['view', 'create', 'edit'] },
      { module: 'expenses', actions: ['view', 'edit', 'reports'] }
    ]
  },
  {
    id: 'user',
    name: 'user',
    displayName: 'مستخدم عادي',
    description: 'صلاحيات محدودة للعرض فقط',
    color: ROLE_COLORS[5],
    priority: 10,
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'clinics', actions: ['view'] },
      { module: 'visits', actions: ['view'] },
      { module: 'expenses', actions: ['view', 'create'] }
    ]
  }
];

export function PermissionsManagement() {
  const { users, setUsers } = useDataProvider();
  const { toast } = useToast();
  
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  
  // Role form state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    description: '',
    color: ROLE_COLORS[0],
    permissions: [] as Permission[]
  });

  // User role editing
  const [userRoleDialogOpen, setUserRoleDialogOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Convert users data to UserRole format
    const formattedUserRoles: UserRole[] = users.map(user => ({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      currentRole: user.role || 'user',
      areas: user.area ? [user.area] : [],
      lines: user.line ? [user.line] : [],
      isActive: true
    }));

    setUserRoles(formattedUserRoles);
  }, [users]);

  const filteredUsers = userRoles.filter(userRole => {
    const matchesSearch = userRole.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userRole.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || userRole.currentRole === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleInfo = (roleName: string) => {
    return roles.find(role => role.name === roleName);
  };

  const handleUpdateUserRole = (userId: string, newRole: string, isActive: boolean) => {
    // Update local state
    setUserRoles(userRoles.map(ur => 
      ur.userId === userId 
        ? { ...ur, currentRole: newRole, isActive }
        : ur
    ));

    // Update users data
    const updatedUsers = users.map(user => 
      user.id === userId 
        ? { ...user, role: newRole }
        : user
    );
    setUsers(updatedUsers);

    toast({
      title: 'تم تحديث الصلاحيات',
      description: `تم تحديث دور المستخدم بنجاح.`,
    });
  };

  const openUserRoleDialog = (userRole: UserRole) => {
    setEditingUserRole(userRole);
    setUserRoleDialogOpen(true);
  };

  const hasPermission = (role: Role, module: string, action: string): boolean => {
    const modulePermission = role.permissions.find(p => p.module === module);
    return modulePermission?.actions.includes(action) || false;
  };

  const togglePermission = (module: string, action: string) => {
    const currentPermissions = [...roleForm.permissions];
    const moduleIndex = currentPermissions.findIndex(p => p.module === module);
    
    if (moduleIndex === -1) {
      // Module doesn't exist, add it with this action
      currentPermissions.push({ module, actions: [action] });
    } else {
      const actions = currentPermissions[moduleIndex].actions;
      if (actions.includes(action)) {
        // Remove action
        const newActions = actions.filter(a => a !== action);
        if (newActions.length === 0) {
          // Remove module if no actions left
          currentPermissions.splice(moduleIndex, 1);
        } else {
          currentPermissions[moduleIndex].actions = newActions;
        }
      } else {
        // Add action
        currentPermissions[moduleIndex].actions.push(action);
      }
    }
    
    setRoleForm({ ...roleForm, permissions: currentPermissions });
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      displayName: '',
      description: '',
      color: ROLE_COLORS[0],
      permissions: []
    });
    setEditingRole(null);
  };

  const handleAddRole = async () => {
    if (!roleForm.name.trim() || !roleForm.displayName.trim()) return;

    const newRole: Role = {
      id: roleForm.name.toLowerCase().replace(/\s+/g, '_'),
      name: roleForm.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: roleForm.displayName.trim(),
      description: roleForm.description.trim(),
      color: roleForm.color,
      priority: 30, // Default priority for custom roles
      permissions: roleForm.permissions
    };

    setRoles([...roles, newRole]);
    resetRoleForm();
    setRoleDialogOpen(false);

    toast({
      title: 'تمت إضافة الدور',
      description: `تمت إضافة دور "${roleForm.displayName}" بنجاح.`,
    });
  };

  const handleEditRole = async () => {
    if (!roleForm.name.trim() || !roleForm.displayName.trim() || !editingRole) return;

    const updatedRoles = roles.map(role =>
      role.id === editingRole.id
        ? {
            ...role,
            displayName: roleForm.displayName.trim(),
            description: roleForm.description.trim(),
            color: roleForm.color,
            permissions: roleForm.permissions
          }
        : role
    );

    setRoles(updatedRoles);
    resetRoleForm();
    setRoleDialogOpen(false);

    toast({
      title: 'تم تحديث الدور',
      description: `تم تحديث دور "${roleForm.displayName}" بنجاح.`,
    });
  };

  const handleDeleteRole = async (role: Role) => {
    // Check if role is being used
    const isInUse = userRoles.some(ur => ur.currentRole === role.name);
    if (isInUse) {
      toast({
        title: 'لا يمكن حذف الدور',
        description: 'هذا الدور مستخدم من قبل مستخدمين. يجب تغيير أدوارهم أولاً.',
        variant: 'destructive',
      });
      return;
    }

    setRoles(roles.filter(r => r.id !== role.id));

    toast({
      title: 'تم حذف الدور',
      description: `تم حذف دور "${role.displayName}" بنجاح.`,
    });
  };

  const openEditRoleDialog = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions]
    });
    setRoleDialogOpen(true);
  };

  const getActionDisplayName = (action: string) => {
    const actionNames: Record<string, string> = {
      'view': 'عرض',
      'create': 'إضافة',
      'edit': 'تعديل',
      'delete': 'حذف',
      'register': 'تسجيل',
      'reports': 'تقارير',
      'export': 'تصدير',
      'advanced': 'متقدم',
      'send': 'إرسال'
    };
    return actionNames[action] || action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-500" />
            إدارة الصلاحيات
          </h2>
          <p className="text-muted-foreground">إدارة أدوار المستخدمين والصلاحيات</p>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {userRoles.length} مستخدم
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {roles.length} دور
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-fit">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            الأدوار
          </TabsTrigger>
        </TabsList>

        {/* Users Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في المستخدمين..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-48">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأدوار</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((userRole) => {
              const role = getRoleInfo(userRole.currentRole);
              
              return (
                <Card key={userRole.userId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{userRole.userName}</CardTitle>
                          <p className="text-sm text-muted-foreground">{userRole.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openUserRoleDialog(userRole)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      {role && (
                        <Badge 
                          style={{ backgroundColor: role.color, color: 'white' }}
                          className="text-xs"
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          {role.displayName}
                        </Badge>
                      )}
                      <Badge variant={userRole.isActive ? 'default' : 'secondary'} className="text-xs">
                        {userRole.isActive ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                        {userRole.isActive ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {userRole.areas.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المنطقة:</span>
                          <span>{userRole.areas.join(', ')}</span>
                        </div>
                      )}
                      {userRole.lines.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الخط:</span>
                          <span>{userRole.lines.join(', ')}</span>
                        </div>
                      )}
                      {role && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الأولوية:</span>
                          <span>{role.priority}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedRole !== 'all' 
                  ? 'لا توجد مستخدمين تطابق الفلترة المحددة' 
                  : 'لا يوجد مستخدمين'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Roles Management Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">أدوار النظام</h3>
              <p className="text-sm text-muted-foreground">إدارة الأدوار والصلاحيات</p>
            </div>
            
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetRoleForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة دور
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role-name">اسم الدور (إنجليزي)</Label>
                      <Input
                        id="role-name"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        placeholder="role_name"
                        disabled={!!editingRole} // Can't change name when editing
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="role-display-name">الاسم المعروض</Label>
                      <Input
                        id="role-display-name"
                        value={roleForm.displayName}
                        onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                        placeholder="مثال: مدير المبيعات"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="role-description">الوصف</Label>
                    <Textarea
                      id="role-description"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      placeholder="وصف الدور والمسؤوليات..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>لون الدور</Label>
                    <div className="flex gap-2 mt-2">
                      {ROLE_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${
                            roleForm.color === color ? 'border-black' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setRoleForm({ ...roleForm, color })}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>الصلاحيات</Label>
                    <div className="mt-4 space-y-4 border rounded-lg p-4">
                      {SYSTEM_MODULES.map((module) => (
                        <div key={module.id} className="space-y-2">
                          <div className="font-medium text-sm">{module.name}</div>
                          <div className="flex gap-2 flex-wrap">
                            {module.actions.map((action) => (
                              <div key={action} className="flex items-center gap-2">
                                <Switch
                                  checked={roleForm.permissions.some(p => 
                                    p.module === module.id && p.actions.includes(action)
                                  )}
                                  onCheckedChange={() => togglePermission(module.id, action)}
                                />
                                <span className="text-sm">{getActionDisplayName(action)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={editingRole ? handleEditRole : handleAddRole} disabled={!roleForm.name.trim() || !roleForm.displayName.trim()}>
                      {editingRole ? 'حفظ التغييرات' : 'إضافة الدور'}
                    </Button>
                    <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.sort((a, b) => b.priority - a.priority).map((role) => {
              const usersCount = userRoles.filter(ur => ur.currentRole === role.name).length;
              const isSystemRole = DEFAULT_ROLES.find(r => r.id === role.id);
              
              return (
                <Card key={role.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <CardTitle className="text-lg">{role.displayName}</CardTitle>
                          <code className="text-xs bg-muted px-1 rounded">{role.name}</code>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditRoleDialog(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!isSystemRole && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الدور</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف دور "{role.displayName}"؟ 
                                  {usersCount > 0 && ` يستخدم هذا الدور ${usersCount} مستخدم.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteRole(role)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={isSystemRole ? 'default' : 'secondary'} className="text-xs">
                        {isSystemRole ? 'دور أساسي' : 'دور مخصص'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        أولوية: {role.priority}
                      </Badge>
                    </div>
                    
                    {role.description && (
                      <p className="text-sm text-muted-foreground mt-2">{role.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">المستخدمين:</span>
                        <span className="font-semibold">{usersCount}</span>
                      </div>
                      
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">الصلاحيات:</div>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((permission, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {SYSTEM_MODULES.find(m => m.id === permission.module)?.name || permission.module}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 3} أخرى
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* User Role Edit Dialog */}
      <Dialog open={userRoleDialogOpen} onOpenChange={setUserRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل صلاحيات المستخدم</DialogTitle>
          </DialogHeader>
          {editingUserRole && (
            <div className="space-y-4">
              <div>
                <Label>المستخدم</Label>
                <div className="mt-1 p-2 bg-muted rounded">
                  <div className="font-medium">{editingUserRole.userName}</div>
                  <div className="text-sm text-muted-foreground">{editingUserRole.userEmail}</div>
                </div>
              </div>
              
              <div>
                <Label>الدور</Label>
                <Select 
                  value={editingUserRole.currentRole} 
                  onValueChange={(value) => setEditingUserRole({...editingUserRole, currentRole: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          {role.displayName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>حالة المستخدم</Label>
                  <p className="text-sm text-muted-foreground">تفعيل أو إلغاء تفعيل المستخدم</p>
                </div>
                <Switch
                  checked={editingUserRole.isActive}
                  onCheckedChange={(checked) => setEditingUserRole({...editingUserRole, isActive: checked})}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    handleUpdateUserRole(editingUserRole.userId, editingUserRole.currentRole, editingUserRole.isActive);
                    setUserRoleDialogOpen(false);
                  }}
                >
                  حفظ التغييرات
                </Button>
                <Button variant="outline" onClick={() => setUserRoleDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}