"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Phone, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Users,
  TrendingUp,
  Package,
  Calendar,
  MapPin,
  Zap,
  Target,
  DollarSign,
  Clock,
  Send,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'in_app' | 'sound';
  enabled: boolean;
  config: Record<string, any>;
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  channels: string[];
  conditions: Record<string, any>;
  template: string;
  enabled: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export function NotificationsCenter() {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'email',
      name: 'البريد الإلكتروني',
      type: 'email',
      enabled: true,
      config: { 
        smtp_server: 'smtp.gmail.com',
        smtp_port: 587,
        from_email: 'system@company.com'
      }
    },
    {
      id: 'sms',
      name: 'الرسائل النصية',
      type: 'sms',
      enabled: false,
      config: { provider: 'twilio', api_key: '' }
    },
    {
      id: 'push',
      name: 'إشعارات الدفع',
      type: 'push',
      enabled: true,
      config: { firebase_key: '' }
    },
    {
      id: 'in_app',
      name: 'إشعارات داخل التطبيق',
      type: 'in_app',
      enabled: true,
      config: {}
    },
    {
      id: 'sound',
      name: 'التنبيهات الصوتية',
      type: 'sound',
      enabled: true,
      config: { volume: 0.7 }
    }
  ]);

  const [rules, setRules] = useState<NotificationRule[]>([
    {
      id: '1',
      name: 'أهداف المبيعات',
      description: 'تنبيه عند اقتراب أو تحقيق أهداف المبيعات',
      trigger: 'sales_target',
      channels: ['email', 'in_app'],
      conditions: { threshold_percentage: 90 },
      template: 'تم تحقيق {percentage}% من هدف المبيعات',
      enabled: true,
      priority: 'high'
    },
    {
      id: '2',
      name: 'مخزون منخفض',
      description: 'تنبيه عند انخفاض المخزون',
      trigger: 'low_inventory',
      channels: ['email', 'sms', 'in_app'],
      conditions: { min_quantity: 10 },
      template: 'تحذير: المنتج {product_name} وصل لكمية {quantity}',
      enabled: true,
      priority: 'urgent'
    },
    {
      id: '3',
      name: 'زيارات متأخرة',
      description: 'تنبيه للزيارات المتأخرة أو المفقودة',
      trigger: 'overdue_visits',
      channels: ['push', 'in_app'],
      conditions: { days_overdue: 2 },
      template: 'زيارة متأخرة للعيادة {clinic_name} منذ {days} أيام',
      enabled: true,
      priority: 'normal'
    },
    {
      id: '4',
      name: 'فواتير مستحقة',
      description: 'تنبيه للفواتير المستحقة السداد',
      trigger: 'overdue_invoices',
      channels: ['email', 'in_app'],
      conditions: { days_overdue: 30 },
      template: 'فاتورة مستحقة للعيادة {clinic_name} بقيمة {amount}',
      enabled: true,
      priority: 'high'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'channels' | 'rules' | 'templates' | 'history'>('channels');
  const [newRule, setNewRule] = useState<Partial<NotificationRule>>({});
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const { toast } = useToast();

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'push': return <Smartphone className="h-4 w-4" />;
      case 'in_app': return <Monitor className="h-4 w-4" />;
      case 'sound': return <Volume2 className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ));
    toast({
      title: 'تم تحديث القناة',
      description: 'تم حفظ إعدادات قناة الإشعارات بنجاح',
    });
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
    toast({
      title: 'تم تحديث القاعدة',
      description: 'تم حفظ إعدادات قاعدة الإشعارات بنجاح',
    });
  };

  const testNotification = () => {
    toast({
      title: '🔔 إشعار تجريبي',
      description: 'هذا مثال على الإشعارات التي سيتم إرسالها',
    });
  };

  return (
    <div className="space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <Bell className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🔔 مركز الإشعارات والتنبيهات الشامل
            </h2>
            <p className="text-blue-600 font-medium">إدارة متقدمة لجميع أنواع الإشعارات والتنبيهات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={testNotification} variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            اختبار إشعار
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{channels.filter(c => c.enabled).length}</div>
            <div className="text-sm text-green-600 flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" />
              قنوات نشطة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{rules.filter(r => r.enabled).length}</div>
            <div className="text-sm text-blue-600 flex items-center justify-center gap-1">
              <Zap className="h-3 w-3" />
              قواعد مفعلة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{rules.filter(r => r.priority === 'urgent').length}</div>
            <div className="text-sm text-orange-600 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              تنبيهات عاجلة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">24</div>
            <div className="text-sm text-purple-600 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              إشعارات اليوم
            </div>
          </CardContent>
        </Card>
      </div>

      {/* شريط التبويبات */}
      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
        {[
          { id: 'channels', label: '📡 قنوات الإشعارات', icon: Settings },
          { id: 'rules', label: '⚡ قواعد التنبيهات', icon: Zap },
          { id: 'templates', label: '📄 القوالب', icon: Eye },
          { id: 'history', label: '📈 التاريخ', icon: Clock }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* محتوى التبويبات */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            إعدادات قنوات الإشعارات
          </h3>
          
          <div className="grid gap-4">
            {channels.map(channel => (
              <Card key={channel.id} className={`border-2 ${channel.enabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {getChannelIcon(channel.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{channel.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {channel.type === 'email' && 'إرسال إشعارات عبر البريد الإلكتروني'}
                          {channel.type === 'sms' && 'إرسال رسائل نصية قصيرة'}
                          {channel.type === 'push' && 'إشعارات الدفع للأجهزة المحمولة'}
                          {channel.type === 'in_app' && 'إشعارات داخل التطبيق'}
                          {channel.type === 'sound' && 'تنبيهات صوتية'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={channel.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {channel.enabled ? 'مفعل' : 'معطل'}
                      </Badge>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => toggleChannel(channel.id)}
                      />
                    </div>
                  </div>
                  
                  {channel.enabled && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {channel.type === 'email' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">خادم SMTP</Label>
                            <Input value={channel.config.smtp_server} readOnly className="text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">المنفذ</Label>
                            <Input value={channel.config.smtp_port} readOnly className="text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">البريد المرسل</Label>
                            <Input value={channel.config.from_email} readOnly className="text-sm" />
                          </div>
                        </div>
                      )}
                      {channel.type === 'sound' && (
                        <div className="flex items-center gap-3">
                          <Label className="text-sm">مستوى الصوت:</Label>
                          <div className="flex-1 max-w-xs">
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1" 
                              value={channel.config.volume}
                              className="w-full"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(channel.config.volume * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              قواعد التنبيهات التلقائية
            </h3>
            <Button 
              onClick={() => setIsCreatingRule(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Target className="h-4 w-4 mr-2" />
              إضافة قاعدة جديدة
            </Button>
          </div>

          <div className="space-y-3">
            {rules.map(rule => (
              <Card key={rule.id} className={`border-2 ${rule.enabled ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{rule.name}</h4>
                        <Badge className={`${getPriorityColor(rule.priority)} text-xs`}>
                          {rule.priority === 'urgent' ? 'عاجل' : 
                           rule.priority === 'high' ? 'عالي' :
                           rule.priority === 'normal' ? 'عادي' : 'منخفض'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-blue-500" />
                          <span>المشغل: {rule.trigger}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Send className="h-3 w-3 text-green-500" />
                          <span>القنوات: {rule.channels.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {rule.enabled ? 'نشط' : 'معطل'}
                      </Badge>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-600" />
            قوالب الرسائل
          </h3>
          
          <div className="grid gap-4">
            {rules.map(rule => (
              <Card key={rule.id} className="border-purple-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{rule.name}</Badge>
                      <Badge className={getPriorityColor(rule.priority)}>
                        {rule.priority === 'urgent' ? 'عاجل' : 
                         rule.priority === 'high' ? 'عالي' :
                         rule.priority === 'normal' ? 'عادي' : 'منخفض'}
                      </Badge>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm">
                      {rule.template}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      المتغيرات المتاحة: {'{product_name}, {quantity}, {clinic_name}, {amount}, {percentage}, {days}'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            سجل الإشعارات المرسلة
          </h3>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-semibold mb-2">قريباً</h4>
              <p className="text-muted-foreground">
                سيتم عرض سجل مفصل لجميع الإشعارات المرسلة هنا
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* تنبيه الحالة */}
      <Alert className="border-blue-500 bg-blue-50">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>🎯 نظام الإشعارات نشط:</strong> جميع القنوات تعمل بشكل طبيعي. 
          يتم إرسال الإشعارات تلقائياً حسب القواعد المحددة.
        </AlertDescription>
      </Alert>
    </div>
  );
}