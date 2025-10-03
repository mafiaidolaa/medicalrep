// @ts-nocheck

import { supabase } from '../supabase';
import { ExpenseRequest, User } from '../../types/accounts';

// Types for notifications
export interface NotificationSettings {
  id: string;
  user_id: string;
  push_notifications: boolean;
  email_notifications: boolean;
  approval_notifications: boolean;
  reminder_notifications: boolean;
  budget_alert_notifications: boolean;
  reminder_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'approval' | 'reminder' | 'budget_alert' | 'info' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
  expires_at?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  is_active: boolean;
  created_at: string;
  last_used: string;
}

class NotificationService {
  // Register service worker and get push subscription
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Subscribe to push notifications
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    const registration = await this.registerServiceWorker();
    if (!registration) return null;

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') return null;

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const pushSubscription = {
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        is_active: true,
      };

      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert(pushSubscription)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return false;

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }

  // Send notification to user
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    priority: Notification['priority'] = 'medium',
    data?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Check user notification settings
      const settings = await this.getNotificationSettings(userId);
      if (!settings || !this.shouldSendNotification(settings, type)) {
        return false;
      }

      // Create notification record
      const notification = {
        user_id: userId,
        title,
        message,
        type,
        priority,
        data,
        read: false,
      };

      const { data: notificationData, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;

      // Send push notification if enabled
      if (settings.push_notifications) {
        await this.sendPushNotification(userId, title, message, data);
      }

      // Send email notification if enabled
      if (settings.email_notifications) {
        await this.sendEmailNotification(userId, title, message, data);
      }

      return true;
    } catch (error) {
      console.error('Send notification failed:', error);
      return false;
    }
  }

  // Send push notification
  private async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!subscriptions?.length) return;

      // Call API to send push notifications
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptions,
          title,
          message,
          data,
        }),
      });
    } catch (error) {
      console.error('Send push notification failed:', error);
    }
  }

  // Send email notification
  private async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      // Call API to send email
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          name: user.full_name,
          title,
          message,
          data,
        }),
      });
    } catch (error) {
      console.error('Send email notification failed:', error);
    }
  }

  // Get user notification settings
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create default settings if none exist
        return await this.createDefaultSettings(userId);
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get notification settings failed:', error);
      return null;
    }
  }

  // Create default notification settings
  async createDefaultSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const defaultSettings = {
        user_id: userId,
        push_notifications: true,
        email_notifications: true,
        approval_notifications: true,
        reminder_notifications: true,
        budget_alert_notifications: true,
        reminder_frequency: 'daily' as const,
      };

      const { data, error } = await supabase
        .from('notification_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default settings failed:', error);
      return null;
    }
  }

  // Update notification settings
  async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update notification settings failed:', error);
      return null;
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get user notifications failed:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Mark notification as read failed:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      return !error;
    } catch (error) {
      console.error('Mark all notifications as read failed:', error);
      return false;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Delete notification failed:', error);
      return false;
    }
  }

  // Send approval notification
  async sendApprovalNotification(
    expenseRequest: ExpenseRequest,
    approver: User
  ): Promise<boolean> {
    const title = `طلب موافقة على مصروفات جديدة`;
    const message = `طلب مصروفات بقيمة ${expenseRequest.total_amount} ${expenseRequest.currency} من ${expenseRequest.employee_name} يحتاج موافقتك`;
    
    return await this.sendNotification(
      approver.id,
      title,
      message,
      'approval',
      'high',
      {
        expense_request_id: expenseRequest.id,
        expense_amount: expenseRequest.total_amount,
        employee_name: expenseRequest.employee_name,
        action_url: `/expenses/approvals?request=${expenseRequest.id}`,
      }
    );
  }

  // Send reminder notification
  async sendReminderNotification(
    expenseRequest: ExpenseRequest,
    approver: User,
    daysPending: number
  ): Promise<boolean> {
    const title = `تذكير: طلب مصروفات معلق منذ ${daysPending} أيام`;
    const message = `طلب مصروفات من ${expenseRequest.employee_name} بقيمة ${expenseRequest.total_amount} ${expenseRequest.currency} ما زال في انتظار موافقتك`;
    
    return await this.sendNotification(
      approver.id,
      title,
      message,
      'reminder',
      daysPending > 7 ? 'urgent' : 'medium',
      {
        expense_request_id: expenseRequest.id,
        days_pending: daysPending,
        action_url: `/expenses/approvals?request=${expenseRequest.id}`,
      }
    );
  }

  // Send budget alert notification
  async sendBudgetAlertNotification(
    userId: string,
    category: string,
    usedAmount: number,
    budgetLimit: number,
    percentage: number
  ): Promise<boolean> {
    const title = `تحذير: تجاوز الميزانية`;
    const message = `تم تجاوز ${percentage}% من ميزانية ${category}. المبلغ المستخدم: ${usedAmount} من أصل ${budgetLimit}`;
    
    return await this.sendNotification(
      userId,
      title,
      message,
      'budget_alert',
      percentage > 90 ? 'urgent' : 'high',
      {
        category,
        used_amount: usedAmount,
        budget_limit: budgetLimit,
        percentage,
        action_url: '/accounts/expenses/reports',
      }
    );
  }

  // Check if notification should be sent based on settings
  private shouldSendNotification(
    settings: NotificationSettings,
    type: Notification['type']
  ): boolean {
    // Check quiet hours
    if (settings.quiet_hours_start && settings.quiet_hours_end) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = this.parseTime(settings.quiet_hours_start);
      const endTime = this.parseTime(settings.quiet_hours_end);
      
      if (startTime <= endTime) {
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      } else {
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      }
    }

    // Check type-specific settings
    switch (type) {
      case 'approval':
        return settings.approval_notifications;
      case 'reminder':
        return settings.reminder_notifications;
      case 'budget_alert':
        return settings.budget_alert_notifications;
      default:
        return true;
    }
  }

  // Parse time string to minutes
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Get device type
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return !error;
    } catch (error) {
      console.error('Cleanup expired notifications failed:', error);
      return false;
    }
  }

  // Send batch notifications (for reminders)
  async sendBatchReminders(): Promise<void> {
    try {
      // Get all pending expense requests older than configured frequency
      const { data: pendingRequests } = await supabase
        .from('expense_requests')
        .select(`
          *,
          assigned_manager:users!expense_requests_assigned_manager_id_fkey(*)
        `)
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Older than 1 day

      if (!pendingRequests?.length) return;

      // Group by manager and send batch reminders
      const groupedByManager = pendingRequests.reduce((acc, request) => {
        const managerId = request.assigned_manager?.id;
        if (!managerId) return acc;
        
        if (!acc[managerId]) {
          acc[managerId] = {
            manager: request.assigned_manager,
            requests: [],
          };
        }
        
        acc[managerId].requests.push(request);
        return acc;
      }, {} as Record<string, { manager: User; requests: ExpenseRequest[] }>);

      // Send notifications
      for (const { manager, requests } of Object.values(groupedByManager)) {
        if (requests.length === 1) {
          const daysPending = Math.floor(
            (Date.now() - new Date(requests[0].created_at).getTime()) / (24 * 60 * 60 * 1000)
          );
          await this.sendReminderNotification(requests[0], manager, daysPending);
        } else {
          // Send batch reminder
          const totalAmount = requests.reduce((sum, req) => sum + req.total_amount, 0);
          const title = `تذكير: ${requests.length} طلبات مصروفات معلقة`;
          const message = `لديك ${requests.length} طلبات مصروفات معلقة بإجمالي قيمة ${totalAmount} تحتاج موافقتك`;
          
          await this.sendNotification(
            manager.id,
            title,
            message,
            'reminder',
            'medium',
            {
              pending_count: requests.length,
              total_amount: totalAmount,
              action_url: '/expenses/approvals',
            }
          );
        }
      }
    } catch (error) {
      console.error('Send batch reminders failed:', error);
    }
  }
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const notificationService = new NotificationService();
export default notificationService;