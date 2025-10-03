"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  Calendar,
  DollarSign,
  ClipboardList,
  UserCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Settings,
  Eye
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'plan_reminder' | 'invoice_due' | 'manager_task' | 'approval' | 'reminder' | 'budget_alert' | 'info' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  action_url?: string;
  auto_generated: boolean;
  created_at: string;
}

interface NotificationStats {
  unread_notifications: number;
  urgent_notifications: number;
}

export function NotificationsDropdown() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    unread_notifications: 0,
    urgent_notifications: 0
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Mock user ID - replace with actual auth
  const currentUserId = 'current-user-id';

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
    
    // جلب الإحصائيات بشكل دوري كل 30 ثانية
    const interval = setInterval(fetchStats, 30000);
    fetchStats(); // جلب أولي
    
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/notifications?user_id=${currentUserId}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          unread_notifications: data.stats?.unread_notifications || 0,
          urgent_notifications: data.stats?.urgent_notifications || 0
        });
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/notifications?user_id=${currentUserId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setStats({
          unread_notifications: data.stats?.unread_notifications || 0,
          urgent_notifications: data.stats?.urgent_notifications || 0
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
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
      
      // تحديث محلي
      setNotifications(prev => prev.map(n => 
        n.id === notification.id 
          ? { ...n, read: true }
          : n
      ));
      
      // تحديث الإحصائيات
      if (!notification.read) {
        setStats(prev => ({
          ...prev,
          unread_notifications: Math.max(0, prev.unread_notifications - 1)
        }));
      }
      
      // إغلاق القائمة والانتقال
      setIsOpen(false);
      
      if (notification.action_url) {
        router.push(notification.action_url);
      }
      
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
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setStats(prev => ({ ...prev, unread_notifications: 0 }));
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديد جميع الإشعارات كمقروءة"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الإشعارات",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'plan_reminder': return <Calendar className="h-4 w-4" />;
      case 'invoice_due': return <DollarSign className="h-4 w-4" />;
      case 'manager_task': return <ClipboardList className="h-4 w-4" />;
      case 'approval': return <UserCheck className="h-4 w-4" />;
      case 'budget_alert': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    if (minutes > 0) return `${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
    return 'الآن';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {stats.unread_notifications > 0 && (
            <>
              {/* النقطة الحمراء للتنبيه */}
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              
              {/* رقم الإشعارات غير المقروءة */}
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600"
              >
                {stats.unread_notifications > 99 ? '99+' : stats.unread_notifications}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end" sideOffset={10}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">الإشعارات</h3>
            {stats.unread_notifications > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {stats.unread_notifications} جديد
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {stats.unread_notifications > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={fetchNotifications}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setIsOpen(false);
              router.push('/notifications');
            }}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">لا توجد إشعارات</p>
              <p className="text-sm text-muted-foreground">سيتم عرض الإشعارات الجديدة هنا</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-muted/20 ${
                    !notification.read ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      notification.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium truncate ${
                          !notification.read ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        {notification.action_url && (
                          <ArrowRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(notification.created_at)}
                        </span>
                        
                        {notification.priority === 'urgent' && (
                          <Badge className="bg-red-500 text-white text-xs">
                            عاجل
                          </Badge>
                        )}
                        
                        {notification.auto_generated && (
                          <Badge variant="secondary" className="text-xs">
                            تلقائي
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-center text-blue-600 hover:text-blue-700"
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              عرض جميع الإشعارات ({notifications.length > 10 ? '10+' : notifications.length})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}