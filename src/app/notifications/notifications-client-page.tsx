
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bell, 
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Calendar,
  DollarSign,
  ClipboardList,
  TrendingUp,
  Send,
  Users,
  MessageSquare,
  Star,
  MoreHorizontal,
  ArrowRight,
  Settings
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/lib/i18n';

interface ExtendedNotification {
  id: string;
  title: string;
  message: string;
  type: 'plan_reminder' | 'invoice_due' | 'manager_task' | 'approval' | 'reminder' | 'budget_alert' | 'info' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  clicked: boolean;
  related_id?: string;
  related_type?: 'plan' | 'invoice' | 'task' | 'expense' | 'visit';
  action_url?: string;
  auto_generated: boolean;
  expires_at?: string;
  data?: any;
  created_at: string;
  updated_at: string;
}

interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  urgent_notifications: number;
  approval_notifications: number;
  reminder_notifications: number;
  budget_alert_notifications: number;
}

interface ManagerTask {
  id: string;
  title: string;
  description: string;
  task_type: 'general' | 'urgent' | 'meeting' | 'deadline' | 'review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_users: string[];
  target_roles: string[];
  due_date?: string;
  expires_at?: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  total_recipients: number;
  read_count: number;
  clicked_count: number;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function NotificationsClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = i18n.t;
  
  // State management
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total_notifications: 0,
    unread_notifications: 0,
    urgent_notifications: 0,
    approval_notifications: 0,
    reminder_notifications: 0,
    budget_alert_notifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  
  // Manager tasks state
  const [managerTasks, setManagerTasks] = useState<ManagerTask[]>([]);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    target_roles: [] as string[],
    due_date: ''
  });

  // Mock user ID (replace with actual auth)
  const currentUserId = 'current-user-id';
  
  useEffect(() => {
    fetchNotifications();
    fetchManagerTasks();
  }, [activeTab, searchTerm, selectedType, selectedPriority, showOnlyUnread]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        user_id: currentUserId,
        limit: '50'
      });
      
      if (selectedType) params.append('type', selectedType);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (showOnlyUnread) params.append('read', 'false');
      
      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setNotifications(data.notifications || []);
        setStats(data.stats || stats);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب الإشعارات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerTasks = async () => {
    try {
      const response = await fetch(`/api/manager-tasks?user_id=${currentUserId}`);
      const data = await response.json();
      
      if (response.ok) {
        setManagerTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching manager tasks:', error);
    }
  };

  const handleNotificationClick = async (notification: ExtendedNotification) => {
    try {
      // تحديث حالة القراءة والنقر
      if (!notification.read) {
        await fetch(`/api/notifications?id=${notification.id}&action=mark_read`, {
          method: 'PATCH'
        });
      }
      
      await fetch(`/api/notifications?id=${notification.id}&action=mark_clicked`, {
        method: 'PATCH'
      });
      
      // التوجه إلى الرابط المطلوب
      if (notification.action_url) {
        router.push(notification.action_url);
      }
      
      // تحديث البيانات محلياً
      setNotifications(prev => prev.map(n => 
        n.id === notification.id 
          ? { ...n, read: true, clicked: true }
          : n
      ));
      
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      for (const notification of unreadNotifications) {
        await fetch(`/api/notifications?id=${notification.id}&action=mark_read`, {
          method: 'PATCH'
        });
      }
      
      await fetchNotifications();
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديد جميع الإشعارات كمقروءة'
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الإشعارات',
        variant: 'destructive'
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الإشعار بنجاح'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الإشعار',
        variant: 'destructive'
      });
    }
  };

  const createManagerTask = async () => {
    try {
      const response = await fetch('/api/manager-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          ...newTask,
          due_date: newTask.due_date || null,
          target_roles: newTask.target_roles
        })
      });
      
      if (response.ok) {
        setShowCreateTaskDialog(false);
        setNewTask({
          title: '',
          description: '',
          task_type: 'general',
          priority: 'medium',
          target_roles: [],
          due_date: ''
        });
        await fetchManagerTasks();
        toast({
          title: 'تم إنشاء المهمة',
          description: 'تم إرسال الإشعارات للفريق المحدد'
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء المهمة',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'plan_reminder': return <Calendar className="h-5 w-5" />;
      case 'invoice_due': return <DollarSign className="h-5 w-5" />;
      case 'manager_task': return <ClipboardList className="h-5 w-5" />;
      case 'approval': return <UserCheck className="h-5 w-5" />;
      case 'budget_alert': return <TrendingUp className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      plan_reminder: 'تذكير خطة',
      invoice_due: 'فاتورة مستحقة',
      manager_task: 'مهمة إدارية',
      approval: 'موافقة',
      reminder: 'تذكير',
      budget_alert: 'تنبيه ميزانية',
      info: 'معلومات',
      warning: 'تحذير',
      error: 'خطأ'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 p-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <Bell className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🔔 مركز الإشعارات والمهام
            </h1>
            <p className="text-blue-600 font-medium">إدارة شاملة للإشعارات والمهام الإدارية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
          {stats.unread_notifications > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{stats.total_notifications}</div>
            <div className="text-xs text-blue-600">إجمالي</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-red-700">{stats.unread_notifications}</div>
            <div className="text-xs text-red-600">غير مقروء</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-orange-700">{stats.urgent_notifications}</div>
            <div className="text-xs text-orange-600">عاجل</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-700">{stats.approval_notifications}</div>
            <div className="text-xs text-green-600">موافقات</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-purple-700">{stats.reminder_notifications}</div>
            <div className="text-xs text-purple-600">تذكيرات</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-yellow-700">{stats.budget_alert_notifications}</div>
            <div className="text-xs text-yellow-600">تنبيهات</div>
          </CardContent>
        </Card>
      </div>

      {/* الفلاتر وشريط البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الإشعارات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="نوع الإشعار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الأنواع</SelectItem>
                <SelectItem value="plan_reminder">تذكير خطة</SelectItem>
                <SelectItem value="invoice_due">فاتورة مستحقة</SelectItem>
                <SelectItem value="manager_task">مهمة إدارية</SelectItem>
                <SelectItem value="approval">موافقة</SelectItem>
                <SelectItem value="budget_alert">تنبيه ميزانية</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={showOnlyUnread ? "default" : "outline"}
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              className="flex items-center gap-2"
            >
              {showOnlyUnread ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              غير مقروء فقط
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            جميع الإشعارات
          </TabsTrigger>
          <TabsTrigger value="manager-tasks" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            المهام الإدارية
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>جاري تحميل الإشعارات...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد إشعارات</h3>
                <p className="text-muted-foreground">سيتم عرض الإشعارات الجديدة هنا عند وصولها</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notification => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                        notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                        notification.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${!notification.read ? 'text-blue-900' : ''}`}>
                            {notification.title}
                          </h4>
                          {notification.auto_generated && (
                            <Badge variant="secondary" className="text-xs">
                              تلقائي
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge 
                              className={`${getPriorityColor(notification.priority)} text-xs`}
                            >
                              {notification.priority === 'urgent' ? 'عاجل' :
                               notification.priority === 'high' ? 'عالي' :
                               notification.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                            
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.created_at).toLocaleString('ar-EG')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {notification.action_url && (
                              <ArrowRight className="h-4 w-4 text-blue-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manager-tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">المهام الإدارية</h3>
            <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-teal-600">
                  <Send className="h-4 w-4 mr-2" />
                  إرسال مهمة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>إنشاء مهمة إدارية جديدة</DialogTitle>
                  <DialogDescription>
                    سيتم إرسال إشعارات للأدوار المحددة تلقائياً
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="task-title">عنوان المهمة</Label>
                    <Input
                      id="task-title"
                      placeholder="مثال: اجتماع الفريق الأسبوعي"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="task-desc">التفاصيل</Label>
                    <Input
                      id="task-desc"
                      placeholder="تفاصيل إضافية عن المهمة..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع المهمة</Label>
                      <Select 
                        value={newTask.task_type} 
                        onValueChange={(value) => setNewTask({...newTask, task_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">عام</SelectItem>
                          <SelectItem value="urgent">عاجل</SelectItem>
                          <SelectItem value="meeting">اجتماع</SelectItem>
                          <SelectItem value="deadline">موعد نهائي</SelectItem>
                          <SelectItem value="review">مراجعة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>الأولوية</Label>
                      <Select 
                        value={newTask.priority} 
                        onValueChange={(value) => setNewTask({...newTask, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">منخفض</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="high">عالي</SelectItem>
                          <SelectItem value="urgent">عاجل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>الأدوار المستهدفة</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['admin', 'manager', 'rep', 'accounting'].map(role => (
                        <label key={role} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newTask.target_roles.includes(role)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({...newTask, target_roles: [...newTask.target_roles, role]});
                              } else {
                                setNewTask({...newTask, target_roles: newTask.target_roles.filter(r => r !== role)});
                              }
                            }}
                          />
                          <span>
                            {role === 'admin' ? 'المدراء' :
                             role === 'manager' ? 'المشرفون' :
                             role === 'rep' ? 'المناديب' : 'المحاسبة'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="due-date">الموعد النهائي (اختياري)</Label>
                    <Input
                      id="due-date"
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={createManagerTask} disabled={!newTask.title || newTask.target_roles.length === 0}>
                      إرسال المهمة
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {managerTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد مهام إدارية</h3>
                <p className="text-muted-foreground">قم بإنشاء مهمة جديدة لإرسالها للفريق</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {managerTasks.map(task => (
                <Card key={task.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority === 'urgent' ? 'عاجل' :
                         task.priority === 'high' ? 'عالي' :
                         task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-blue-700">{task.total_recipients}</div>
                        <div className="text-xs text-blue-600">مستلمين</div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-green-700">{task.read_count}</div>
                        <div className="text-xs text-green-600">قرأوا</div>
                      </div>
                      
                      <div className="bg-orange-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-orange-700">{task.clicked_count}</div>
                        <div className="text-xs text-orange-600">نقروا</div>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-purple-700">
                          {task.total_recipients > 0 ? Math.round((task.read_count / task.total_recipients) * 100) : 0}%
                        </div>
                        <div className="text-xs text-purple-600">نسبة القراءة</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                      <span>أرسلت بواسطة: {task.sender?.full_name}</span>
                      <span>{new Date(task.created_at).toLocaleString('ar-EG')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">سيتم إضافة إعدادات الإشعارات قريباً...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
