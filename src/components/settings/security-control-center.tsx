"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Users, 
  Eye, 
  Ban, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Activity,
  Server,
  Database,
  Lock,
  Key,
  UserX,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Zap,
  Target,
  Crown,
  Sword
} from 'lucide-react';

interface SecurityMetrics {
  activeSessions: number;
  blockedIPs: number;
  suspiciousActivities: number;
  failedLogins: number;
  totalUsers: number;
  adminUsers: number;
}

interface SecurityEvent {
  id: string;
  type: 'login_success' | 'login_failed' | 'suspicious_activity' | 'permission_change' | 'data_access';
  user: string;
  ip: string;
  location: string;
  timestamp: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function SecurityControlCenter() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    activeSessions: 0,
    blockedIPs: 0,
    suspiciousActivities: 0,
    failedLogins: 0,
    totalUsers: 0,
    adminUsers: 0
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [newBlockedIP, setNewBlockedIP] = useState('');
  const [autoSecurityEnabled, setAutoSecurityEnabled] = useState(true);

  // تحميل البيانات
  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      // محاكاة تحميل البيانات
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMetrics({
        activeSessions: 12,
        blockedIPs: 3,
        suspiciousActivities: 2,
        failedLogins: 5,
        totalUsers: 25,
        adminUsers: 3
      });

      setSecurityEvents([
        {
          id: '1',
          type: 'login_failed',
          user: 'anonymous',
          ip: '192.168.1.100',
          location: 'Cairo, Egypt',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          details: 'Multiple failed login attempts with username: admin',
          severity: 'high'
        },
        {
          id: '2',
          type: 'suspicious_activity',
          user: 'user@example.com',
          ip: '10.0.0.5',
          location: 'Alexandria, Egypt',
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          details: 'Unusual data access pattern detected',
          severity: 'medium'
        },
        {
          id: '3',
          type: 'permission_change',
          user: 'admin@system.com',
          ip: '192.168.1.1',
          location: 'Cairo, Egypt',
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          details: 'User permissions elevated to admin level',
          severity: 'critical'
        }
      ]);

    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login_success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'login_failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'permission_change': return <Key className="h-4 w-4 text-purple-500" />;
      case 'data_access': return <Database className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const blockIP = () => {
    if (newBlockedIP) {
      // تنفيذ حظر IP
      setMetrics(prev => ({ ...prev, blockedIPs: prev.blockedIPs + 1 }));
      setNewBlockedIP('');
      alert(`✅ تم حظر IP: ${newBlockedIP}`);
    }
  };

  const terminateAllSessions = () => {
    if (confirm('🔥 هل أنت متأكد من إنهاء جميع الجلسات؟ سيتم فصل جميع المستخدمين!')) {
      setMetrics(prev => ({ ...prev, activeSessions: 0 }));
      alert('⚡ تم إنهاء جميع الجلسات بنجاح! أنت الآن المسيطر الوحيد!');
    }
  };

  const emergencyLockdown = () => {
    if (confirm('🚨 تحذير! هذا سيقوم بقفل النظام بالكامل وإنهاء جميع الجلسات ومنع الوصول الجديد!')) {
      alert('🔒 تم تفعيل وضع الطوارئ! النظام مقفل بالكامل!');
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان الرئيسي مع رمز التحكم */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              🛡️ مركز الأمان والتحكم الشامل
            </h2>
            <p className="text-red-600 font-medium">السيطرة المطلقة على أمان النظام</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-600 text-white px-3 py-1">
            <Sword className="h-3 w-3 ml-1" />
            وضع السيطرة الكاملة
          </Badge>
        </div>
      </div>

      {/* مؤشرات الأمان السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{metrics.activeSessions}</div>
            <div className="text-sm text-green-600 flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              الجلسات النشطة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{metrics.blockedIPs}</div>
            <div className="text-sm text-red-600 flex items-center justify-center gap-1">
              <Ban className="h-3 w-3" />
              IPs محظورة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{metrics.suspiciousActivities}</div>
            <div className="text-sm text-orange-600 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              أنشطة مشبوهة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{metrics.failedLogins}</div>
            <div className="text-sm text-purple-600 flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3" />
              محاولات فاشلة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{metrics.totalUsers}</div>
            <div className="text-sm text-blue-600 flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              إجمالي المستخدمين
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{metrics.adminUsers}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Crown className="h-3 w-3" />
              المدراء
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أدوات التحكم السريع */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Target className="h-5 w-5" />
              🎯 أدوات السيطرة السريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* حظر IP */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="أدخل IP لحظره"
                value={newBlockedIP}
                onChange={(e) => setNewBlockedIP(e.target.value)}
                className="flex-1"
              />
              <Button onClick={blockIP} variant="destructive" size="sm">
                <Ban className="h-4 w-4 mr-2" />
                حظر فوري
              </Button>
            </div>

            {/* إنهاء جميع الجلسات */}
            <Button 
              onClick={terminateAllSessions}
              variant="destructive" 
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <UserX className="h-4 w-4 mr-2" />
              ⚡ إنهاء جميع الجلسات
            </Button>

            {/* وضع الطوارئ */}
            <Button 
              onClick={emergencyLockdown}
              variant="destructive" 
              className="w-full bg-red-700 hover:bg-red-800"
            >
              <Lock className="h-4 w-4 mr-2" />
              🚨 تفعيل وضع الطوارئ
            </Button>

            {/* الحماية التلقائية */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">الحماية التلقائية</span>
              </div>
              <Switch
                checked={autoSecurityEnabled}
                onCheckedChange={setAutoSecurityEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* سجل الأنشطة الأمنية */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              👁️ سجل المراقبة المباشر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {securityEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getSeverityColor(event.severity)}`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{event.user}</div>
                        <div className="text-xs opacity-75">{event.details}</div>
                      </div>
                    </div>
                    <div className="text-xs text-right">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.ip}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.timestamp).toLocaleTimeString('ar-EG')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أدوات إدارة النسخ الاحتياطية */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-700 flex items-center gap-2">
            <Database className="h-5 w-5" />
            💾 إدارة النسخ الاحتياطية والاستعادة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              نسخة احتياطية فورية
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              استعادة من نسخة احتياطية
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              نسخ احتياطية مجدولة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* تنبيه الحالة */}
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🎯 حالة السيطرة: نشطة</strong> - أنت تتحكم بالكامل في جميع جوانب الأمان. 
          جميع الأنشطة تحت المراقبة المباشرة والحماية التلقائية مفعلة.
        </AlertDescription>
      </Alert>
    </div>
  );
}