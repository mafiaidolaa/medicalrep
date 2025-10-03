"use client";

import { useDataProvider } from '@/lib/data-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, Filter, Send, Mail, UserCheck } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';

const NotificationCard = ({ notification }: { notification: Notification }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`${notification.read ? 'opacity-75' : 'border-primary/20'} transition-all`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getIcon(notification.type)}
            <span className="text-base">{notification.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {notification.section && <Badge variant="outline">{notification.section}</Badge>}
            {notification.priority && <Badge variant="outline">{notification.priority}</Badge>}
            {!notification.read && <Badge variant="secondary">New</Badge>}
            <Badge variant="outline">{notification.type}</Badge>
          </div>
        </CardTitle>
        <CardDescription>{formatDate(notification.timestamp)}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        {notification.actionUrl && (
          <div className="mt-3">
            <a href={notification.actionUrl} className="text-primary hover:underline text-sm">فتح الرابط</a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function NotificationsPage() {
  const { notifications, isLoading, isClient, setNotifications, currentUser } = useDataProvider();

  const [section, setSection] = useState<'all' | 'managers' | 'accounting' | 'system' | 'approvals' | 'reminders'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    section: 'managers',
    audienceAll: false,
    roles: [] as string[],
    areas: [] as string[],
    lines: [] as string[],
  });

  const canCompose = useMemo(() => {
    const role = (currentUser?.role || '').toLowerCase();
    return ['admin','manager','accounting','accountant'].includes(role);
  }, [currentUser?.role]);

  const filtered = useMemo(() => {
    let rows = notifications as Notification[];
    if (section !== 'all') rows = rows.filter(n => (n.section || '').toLowerCase() === section);
    if (unreadOnly) rows = rows.filter(n => !n.read);
    return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, section, unreadOnly]);

  async function markAllAsRead() {
    try {
      const unread = filtered.filter(n => !n.read);
      await Promise.all(unread.map(n => fetch(`/api/notifications?id=${encodeURIComponent(n.id)}&action=mark_read`, { method: 'PATCH' })));
      await setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  }

  async function handleSend() {
    try {
      setSending(true);
      const body: any = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        section: form.section,
        sender_id: currentUser?.id,
        sender_role: currentUser?.role,
        audience: {
          all: form.audienceAll,
          roles: form.roles,
          areas: form.areas,
          lines: form.lines,
        },
      };
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('send failed');
      setComposeOpen(false);
      setForm({ title: '', message: '', type: 'info', priority: 'medium', section: 'managers', audienceAll: false, roles: [], areas: [], lines: [] });
    } catch (e) {
      console.error('Failed to send notification', e);
    } finally {
      setSending(false);
    }
  }

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="unreadOnly" className="text-sm">Unread only</Label>
            <Switch id="unreadOnly" checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          </div>
          <Button variant="outline" onClick={markAllAsRead} disabled={filtered.every(n => n.read)}>
            <UserCheck className="h-4 w-4 mr-2" /> Mark all as read
          </Button>
          {canCompose && (
            <Button onClick={() => setComposeOpen(true)}>
              <Send className="h-4 w-4 mr-2" /> Compose
            </Button>
          )}
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as any)}>
        <TabsList className="grid grid-cols-6 w-full sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(notification => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No notifications</h3>
              <p className="mt-1 text-sm text-muted-foreground">You're all caught up!</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose notification</DialogTitle>
            <DialogDescription>Send a categorized notification to selected audience.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Section</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                  <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="managers">Managers</SelectItem>
                    <SelectItem value="accounting">Accounting</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="approvals">Approvals</SelectItem>
                    <SelectItem value="reminders">Reminders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="audAll">All users</Label>
                  <Switch id="audAll" checked={form.audienceAll} onCheckedChange={(v) => setForm({ ...form, audienceAll: v })} />
                </div>
              </div>
              {!form.audienceAll && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label>Roles</Label>
                    <div className="flex flex-wrap gap-2">
                      {['medical_rep','manager','accounting','accountant','admin'].map(r => (
                        <Button key={r} type="button" variant={form.roles.includes(r) ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, roles: form.roles.includes(r) ? form.roles.filter(x => x!==r) : [...form.roles, r] })}>{r}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Areas</Label>
                    <Input placeholder="e.g. القاهرة, الجيزة" onBlur={(e) => setForm({ ...form, areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Lines</Label>
                    <Input placeholder="e.g. الخط الأول, الخط الثاني" onBlur={(e) => setForm({ ...form, lines: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !form.title || !form.message}>
              <Send className="h-4 w-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
