"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Edit, Trash2, Search, UserPlus, Shield, Phone, Mail, Calendar, MapPin, Briefcase, AlertCircle, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { useDirectData } from '@/lib/direct-data-provider';
import type { User } from '@/lib/types';

const USER_ROLES = [
  { value: 'admin', label: 'مدير عام', color: 'bg-red-100 text-red-800', icon: '👑' },
  { value: 'manager', label: 'مدير', color: 'bg-blue-100 text-blue-800', icon: '👨‍💼' },
  { value: 'medical_rep', label: 'مندوب طبي', color: 'bg-green-100 text-green-800', icon: '👨‍⚕️' },
  { value: 'accountant', label: 'محاسب', color: 'bg-yellow-100 text-yellow-800', icon: '🧮' }
];

interface DirectUsersManagementProps {
  showAddDialog?: boolean;
  onUserAdded?: (user: User) => void;
}

export function DirectUsersManagement({ showAddDialog = false, onUserAdded }: DirectUsersManagementProps) {
  const {
    isLoading,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    getAreas,
    getLines
  } = useDirectData();

  // الحالة المحلية - بدون كاش، فقط للعرض
  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);

  // Defensive normalization for areas and lines derived from state
  const safeAreas = Array.isArray(areas)
    ? (areas.filter(Boolean).map(String) as string[])
    : (areas && typeof areas === 'object')
      ? (Object.values(areas as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  const safeLines = Array.isArray(lines)
    ? (lines.filter(Boolean).map(String) as string[])
    : (lines && typeof lines === 'object')
      ? (Object.values(lines as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  const [refreshing, setRefreshing] = useState(false);

  // نموذج المستخدم
  const [userDialogOpen, setUserDialogOpen] = useState(showAddDialog);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'medical_rep' as User['role'],
    area: '',
    line: '',
    hireDate: new Date().toISOString().split('T')[0],
    primaryPhone: '',
    whatsappPhone: '',
    altPhone: '',
    profilePicture: '',
    salesTarget: 0,
    visitsTarget: 0,
    managerId: '',
    isActive: true
  });

  // تحميل البيانات مباشرة من قاعدة البيانات
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [usersData, areasData, linesData] = await Promise.all([
        getAllUsers(),
        getAreas(),
        getLines()
      ]);
      
      setUsers(usersData);
      setAreas(areasData);
      setLines(linesData);
    } catch (error) {
      console.error('Failed to load users data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // تحميل البيانات عند التحميل الأول
  useEffect(() => {
    loadData();
  }, []);

  // تصفية المستخدمين
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.primaryPhone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesArea = selectedArea === 'all' || user.area === selectedArea;
    return matchesSearch && matchesRole && matchesArea;
  });

  const activeUsers = users.filter(u => u.isActive);
  const inactiveUsers = users.filter(u => !u.isActive);

  // إعادة تعيين النموذج
  const resetUserForm = () => {
    setUserForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'medical_rep',
      area: '',
      line: '',
      hireDate: new Date().toISOString().split('T')[0],
      primaryPhone: '',
      whatsappPhone: '',
      altPhone: '',
      profilePicture: '',
      salesTarget: 0,
      visitsTarget: 0,
      managerId: '',
      isActive: true
    });
    setEditingUser(null);
  };

  // إضافة مستخدم جديد - اتصال مباشر
  const handleAddUser = async () => {
    if (!userForm.fullName.trim() || !userForm.username.trim() || !userForm.email.trim()) return;

    try {
      const newUser = await createUser({
        ...userForm,
        id: undefined // سيتم إنشاء ID جديد من قاعدة البيانات
      });

      // تحديث القائمة مباشرة
      await loadData();
      
      resetUserForm();
      setUserDialogOpen(false);
      
      if (onUserAdded) {
        onUserAdded(newUser);
      }
    } catch (error) {
      console.error('Add user failed:', error);
    }
  };

  // تعديل مستخدم - اتصال مباشر
  const handleEditUser = async () => {
    if (!userForm.fullName.trim() || !userForm.username.trim() || !userForm.email.trim() || !editingUser) return;

    try {
      await updateUser(editingUser.id, userForm);

      // تحديث القائمة مباشرة
      await loadData();
      
      resetUserForm();
      setUserDialogOpen(false);
    } catch (error) {
      console.error('Update user failed:', error);
    }
  };

  // حذف مستخدم - اتصال مباشر (نقل إلى سلة المهملات)
  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUser(user.id);
      
      // تحديث القائمة مباشرة
      await loadData();
    } catch (error) {
      console.error('Delete user failed:', error);
    }
  };

  // فتح حوار التعديل
  const openEditUserDialog = (user: User) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '', // لا نعرض كلمة المرور الحالية
      role: user.role,
      area: user.area || '',
      line: user.line || '',
      hireDate: user.hireDate ? user.hireDate.split('T')[0] : new Date().toISOString().split('T')[0],
      primaryPhone: user.primaryPhone || '',
      whatsappPhone: user.whatsappPhone || '',
      altPhone: user.altPhone || '',
      profilePicture: user.profilePicture || '',
      salesTarget: user.salesTarget || 0,
      visitsTarget: user.visitsTarget || 0,
      managerId: user.managerId || '',
      isActive: user.isActive
    });
    setUserDialogOpen(true);
  };

  // الحصول على معلومات الدور
  const getRoleInfo = (role: User['role']) => {
    return USER_ROLES.find(r => r.value === role) || USER_ROLES.find(r => r.value === 'medical_rep')!;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            إدارة المستخدمين المباشرة
          </h2>
          <p className="text-muted-foreground">إدارة المستخدمين بالاتصال المباشر مع قاعدة البيانات</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            تحديث مباشر
          </Button>
          
          <Badge variant="outline" className="px-3 py-1">
            {users.length} مستخدم
          </Badge>
          
          {activeUsers.length > 0 && (
            <Badge variant="default" className="px-3 py-1 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              {activeUsers.length} نشط
            </Badge>
          )}
          
          {inactiveUsers.length > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              {inactiveUsers.length} غير نشط
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-fit">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            النشطين ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            غير النشطين ({inactiveUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
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
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب المنطقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المناطق</SelectItem>
                    {safeAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetUserForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة مستخدم
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="user-fullName">الاسم الكامل</Label>
                    <Input
                      id="user-fullName"
                      value={userForm.fullName}
                      onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                      placeholder="الاسم الكامل"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="user-username">اسم المستخدم</Label>
                    <Input
                      id="user-username"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="اسم المستخدم"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="user-email">البريد الإلكتروني</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="البريد الإلكتروني"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="user-password">كلمة المرور {editingUser && '(اتركها فارغة لعدم التغيير)'}</Label>
                    <Input
                      id="user-password"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="كلمة المرور"
                      required={!editingUser}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="user-role">الدور</Label>
                    <Select value={userForm.role} onValueChange={(value: User['role']) => setUserForm({ ...userForm, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.icon} {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="user-area">المنطقة</Label>
                    <Select value={userForm.area} onValueChange={(value) => setUserForm({ ...userForm, area: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنطقة" />
                      </SelectTrigger>
                  <SelectContent>
                    {safeAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="user-line">الخط</Label>
                    <Select value={userForm.line} onValueChange={(value) => setUserForm({ ...userForm, line: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الخط" />
                      </SelectTrigger>
                  <SelectContent>
                    {safeLines.map((line) => (
                      <SelectItem key={line} value={line}>
                        {line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="user-primaryPhone">الهاتف الأساسي</Label>
                    <Input
                      id="user-primaryPhone"
                      value={userForm.primaryPhone}
                      onChange={(e) => setUserForm({ ...userForm, primaryPhone: e.target.value })}
                      placeholder="الهاتف الأساسي"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="user-hireDate">تاريخ التعيين</Label>
                    <Input
                      id="user-hireDate"
                      type="date"
                      value={userForm.hireDate}
                      onChange={(e) => setUserForm({ ...userForm, hireDate: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="user-isActive">الحالة</Label>
                    <Select value={userForm.isActive.toString()} onValueChange={(value) => setUserForm({ ...userForm, isActive: value === 'true' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">نشط</SelectItem>
                        <SelectItem value="false">غير نشط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={editingUser ? handleEditUser : handleAddUser}
                    disabled={isLoading || !userForm.fullName.trim() || !userForm.username.trim() || !userForm.email.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : editingUser ? (
                      <Edit className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {editingUser ? 'حفظ التغييرات' : 'إضافة المستخدم'}
                  </Button>
                  <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isLoading || refreshing) && users.length === 0 ? (
              <div className="col-span-full flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="mr-2">جاري التحميل المباشر...</span>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const roleInfo = getRoleInfo(user.role);
                
                return (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{user.fullName}</CardTitle>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditUserDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف المستخدم "{user.fullName}"؟ سيتم نقله إلى سلة المهملات.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUser(user)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={roleInfo.color}>
                          {roleInfo.icon} {roleInfo.label}
                        </Badge>
                        {user.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            غير نشط
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                          <span>{user.email}</span>
                        </div>
                        {user.primaryPhone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>{user.primaryPhone}</span>
                          </div>
                        )}
                        {user.area && (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>{user.area}</span>
                          </div>
                        )}
                        {user.line && (
                          <div className="flex items-center text-sm">
                            <Briefcase className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>{user.line}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                          <span>تاريخ التعيين: {new Date(user.hireDate).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {filteredUsers.length === 0 && !isLoading && !refreshing && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedRole !== 'all' || selectedArea !== 'all' 
                  ? 'لا يوجد مستخدمين يطابقون الفلترة المحددة' 
                  : 'لم يتم إضافة أي مستخدمين بعد'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Active Users Tab */}
        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeUsers.map((user) => {
              const roleInfo = getRoleInfo(user.role);
              return (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{user.fullName}</CardTitle>
                        <Badge className={roleInfo.color}>
                          {roleInfo.icon} {roleInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Inactive Users Tab */}
        <TabsContent value="inactive" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveUsers.map((user) => {
              const roleInfo = getRoleInfo(user.role);
              return (
                <Card key={user.id} className="hover:shadow-md transition-shadow opacity-75">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold">
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{user.fullName}</CardTitle>
                        <Badge variant="secondary">
                          {roleInfo.icon} {roleInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}