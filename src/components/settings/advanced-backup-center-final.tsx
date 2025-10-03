"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  HardDrive,
  Cloud,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Database,
  FileText,
  Settings,
  Save,
  Shield,
  Activity,
  Calendar,
  Server,
  Eye,
  Archive,
  History,
  RotateCcw,
  Plus,
  FolderOpen,
  CloudDrizzle,
  Users,
  Palette,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupHistory {
  id: string;
  date: string;
  type: string;
  location: string;
  size: string;
  duration: string;
  status: string;
  components: string[];
  error?: string;
}

export function AdvancedBackupCenter() {
  const [activeTab, setActiveTab] = useState<'overview' | 'backup' | 'restore' | 'storage' | 'cloud' | 'schedules'>('overview');
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [cloudConnections, setCloudConnections] = useState<Record<string, boolean>>({});
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [cloudSetupDialogOpen, setCloudSetupDialogOpen] = useState(false);
  const [selectedBackupLocations, setSelectedBackupLocations] = useState<string[]>([]);
  const [selectedCloudServices, setSelectedCloudServices] = useState<string[]>([]);
  const { toast } = useToast();

  // مكونات النظام المتاحة للنسخ الاحتياطي
  const systemComponents = [
    { id: 'database', name: 'قاعدة البيانات', icon: Database, size: '2.5 GB', critical: true },
    { id: 'user_data', name: 'بيانات المستخدمين', icon: Users, size: '1.2 GB', critical: true },
    { id: 'settings', name: 'إعدادات النظام', icon: Settings, size: '15 MB', critical: true },
    { id: 'files', name: 'الملفات والمستندات', icon: FileText, size: '800 MB', critical: false },
    { id: 'images', name: 'الصور والوسائط', icon: Eye, size: '3.1 GB', critical: false },
    { id: 'logs', name: 'ملفات السجلات', icon: Activity, size: '120 MB', critical: false },
    { id: 'themes', name: 'القوالب والثيمات', icon: Palette, size: '45 MB', critical: false },
    { id: 'cache', name: 'الذاكرة المؤقتة', icon: Zap, size: '300 MB', critical: false }
  ];

  // خدمات التخزين السحابي المدعومة
  const cloudServices = [
    { id: 'google_drive', name: 'Google Drive', icon: Cloud, color: 'bg-blue-500', freeSpace: '15 GB' },
    { id: 'dropbox', name: 'Dropbox', icon: CloudDrizzle, color: 'bg-blue-700', freeSpace: '2 GB' },
    { id: 'onedrive', name: 'OneDrive', icon: Cloud, color: 'bg-blue-600', freeSpace: '5 GB' },
    { id: 'mega', name: 'MEGA', icon: Shield, color: 'bg-red-500', freeSpace: '50 GB' },
    { id: 'icloud', name: 'iCloud', icon: Cloud, color: 'bg-gray-600', freeSpace: '5 GB' },
    { id: 'aws_s3', name: 'Amazon S3', icon: Server, color: 'bg-orange-500', freeSpace: 'مدفوع' }
  ];

  // مواقع التخزين المحلي
  const [localStorageLocations, setLocalStorageLocations] = useState([
    { id: 'system_drive', name: 'القرص الصلب الرئيسي', path: 'C:\\Backups', free: '45.2 GB', total: '500 GB', enabled: true },
    { id: 'external_drive', name: 'القرص الخارجي', path: 'D:\\EP_Backups', free: '120 GB', total: '1 TB', enabled: false },
    { id: 'network_drive', name: 'محرك الشبكة', path: '\\\\server\\backups', free: 'غير متاح', total: 'غير محدد', enabled: false }
  ]);

  // سجل النسخ الاحتياطي
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([
    {
      id: '1',
      date: '2025-09-26 14:30',
      type: 'كاملة',
      location: 'محلي + Google Drive',
      size: '4.2 GB',
      duration: '12 دقيقة',
      status: 'نجح',
      components: ['database', 'user_data', 'settings', 'files']
    },
    {
      id: '2', 
      date: '2025-09-25 20:15',
      type: 'تدريجية',
      location: 'محلي',
      size: '180 MB',
      duration: '2 دقيقة',
      status: 'نجح',
      components: ['database', 'user_data']
    },
    {
      id: '3',
      date: '2025-09-24 02:00',
      type: 'كاملة',
      location: 'Google Drive',
      size: '4.1 GB', 
      duration: '25 دقيقة',
      status: 'فشل',
      components: ['database', 'user_data', 'settings', 'files'],
      error: 'انتهت مساحة التخزين السحابي'
    }
  ]);

  // تشغيل النسخ الاحتياطي
  const runBackup = async (type: 'full' | 'incremental', components: string[], locations: string[]) => {
    setIsBackupRunning(true);
    setBackupProgress(0);
    
    toast({
      title: '🚀 بدأ النسخ الاحتياطي',
      description: `جاري إنشاء نسخة احتياطية ${type === 'full' ? 'كاملة' : 'تدريجية'}...`,
    });

    try {
      // محاكاة عملية النسخ الاحتياطي
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setBackupProgress(i);
      }
      
      // إضافة سجل جديد للنسخ الاحتياطي
      const newBackup: BackupHistory = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('ar'),
        type: type === 'full' ? 'كاملة' : 'تدريجية',
        location: locations.join(' + '),
        size: type === 'full' ? '4.5 GB' : '250 MB',
        duration: type === 'full' ? '15 دقيقة' : '3 دقائق',
        status: 'نجح',
        components
      };
      
      setBackupHistory(prev => [newBackup, ...prev]);
      
      toast({
        title: '✅ اكتمل النسخ الاحتياطي',
        description: 'تم إنشاء النسخة الاحتياطية وحفظها بنجاح',
      });
    } catch (error) {
      toast({
        title: '❌ فشل النسخ الاحتياطي',
        description: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية',
        variant: 'destructive'
      });
    } finally {
      setIsBackupRunning(false);
      setBackupProgress(0);
      setBackupDialogOpen(false);
    }
  };

  // استرداد النسخة الاحتياطية
  const restoreBackup = async (backupId: string, selectedComponents: string[]) => {
    toast({
      title: '🔄 بدأ الاسترداد',
      description: 'جاري استرداد المكونات المحددة...',
    });

    try {
      // محاكاة عملية الاسترداد
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      toast({
        title: '✅ اكتمل الاسترداد',
        description: `تم استرداد ${selectedComponents.length} مكون بنجاح`,
      });
      setRestoreDialogOpen(false);
    } catch (error) {
      toast({
        title: '❌ فشل الاسترداد',
        description: 'حدث خطأ أثناء عملية الاسترداد',
        variant: 'destructive'
      });
    }
  };

  // تحميل النسخة الاحتياطية من الجهاز
  const downloadBackupToDevice = (backupId: string) => {
    toast({
      title: '📥 جاري التحميل',
      description: 'بدأ تحميل النسخة الاحتياطية إلى جهازك...',
    });
    
    // محاكاة تحميل الملف
    setTimeout(() => {
      toast({
        title: '✅ اكتمل التحميل',
        description: 'تم تحميل النسخة الاحتياطية إلى مجلد التحميلات',
      });
    }, 2000);
  };

  // رفع النسخة الاحتياطية من الجهاز
  const uploadBackupFromDevice = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.tar.gz,.7z';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: '📤 جاري الرفع',
          description: `رفع الملف: ${file.name}`,
        });
        
        setTimeout(() => {
          toast({
            title: '✅ اكتمل الرفع',
            description: 'تم رفع النسخة الاحتياطية وتحليلها بنجاح',
          });
        }, 3000);
      }
    };
    input.click();
  };

  // ربط خدمة سحابية
  const connectCloudService = (serviceId: string) => {
    toast({
      title: '🔗 جاري الربط',
      description: 'يتم ربط الخدمة السحابية...',
    });
    
    setTimeout(() => {
      setCloudConnections(prev => ({ ...prev, [serviceId]: true }));
      toast({
        title: '✅ تم الربط بنجاح',
        description: 'تم ربط الخدمة السحابية وهي جاهزة للاستخدام',
      });
      setCloudSetupDialogOpen(false);
    }, 2000);
  };

  const stats = { 
    totalBackups: backupHistory.length, 
    successfulBackups: backupHistory.filter(b => b.status === 'نجح').length 
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <HardDrive className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              مركز النسخ الاحتياطي المتقدم
            </h2>
            <p className="text-muted-foreground">إدارة شاملة للنسخ الاحتياطي مع دعم التخزين المحلي والسحابي</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {stats.totalBackups} نسخة احتياطية
          </Badge>
          <Badge variant="default" className="px-3 py-1 bg-green-500">
            {stats.successfulBackups} نجحت
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setBackupDialogOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Save className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">إنشاء نسخة احتياطية</h3>
              <p className="text-sm text-muted-foreground">نسخ احتياطي فوري</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setRestoreDialogOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <RotateCcw className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">استرداد النسخة</h3>
              <p className="text-sm text-muted-foreground">استرداد البيانات</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setCloudSetupDialogOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Cloud className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">ربط التخزين السحابي</h3>
              <p className="text-sm text-muted-foreground">إعداد الخدمات السحابية</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      {isBackupRunning && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">جاري إنشاء النسخة الاحتياطية...</span>
              <span className="text-sm text-muted-foreground">{backupProgress}%</span>
            </div>
            <Progress value={backupProgress} className="h-3" />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8" dir="rtl">
          {[
            { id: 'overview', name: 'نظرة عامة', icon: Activity },
            { id: 'backup', name: 'النسخ الاحتياطي', icon: Save },
            { id: 'restore', name: 'الاسترداد', icon: RotateCcw },
            { id: 'storage', name: 'التخزين المحلي', icon: HardDrive },
            { id: 'cloud', name: 'التخزين السحابي', icon: Cloud },
            { id: 'schedules', name: 'الجدولة', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  حالة النسخ الاحتياطي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>آخر نسخة احتياطية</span>
                    <Badge variant="outline">{backupHistory[0]?.date || 'لا توجد'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>النسخ الناجحة</span>
                    <Badge variant="default" className="bg-green-500">{stats.successfulBackups}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>إجمالي المساحة المحفوظة</span>
                    <Badge variant="outline">8.2 GB</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Backups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  النسخ الأخيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {backupHistory.slice(0, 3).map(backup => (
                    <div key={backup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{backup.type}</p>
                        <p className="text-sm text-muted-foreground">{backup.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={backup.status === 'نجح' ? 'default' : 'destructive'}
                          className={backup.status === 'نجح' ? 'bg-green-500' : ''}
                        >
                          {backup.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => downloadBackupToDevice(backup.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إنشاء نسخة احتياطية جديدة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button onClick={() => setBackupDialogOpen(true)} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    نسخة احتياطية كاملة
                  </Button>
                  <Button variant="outline" onClick={() => runBackup('incremental', selectedComponents, selectedBackupLocations)} className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    نسخة تدريجية
                  </Button>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">المكونات المحددة للنسخ الاحتياطي</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemComponents.map(component => {
                      const Icon = component.icon;
                      return (
                        <div key={component.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            checked={selectedComponents.includes(component.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedComponents([...selectedComponents, component.id]);
                              } else {
                                setSelectedComponents(selectedComponents.filter(id => id !== component.id));
                              }
                            }}
                          />
                          <Icon className="h-5 w-5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{component.name}</p>
                              {component.critical && <Badge variant="destructive" className="text-xs">مهم</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{component.size}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Restore Tab */}
        {activeTab === 'restore' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>استرداد النسخ الاحتياطية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 mb-6">
                    <Button onClick={() => setRestoreDialogOpen(true)} className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      استرداد من السحابة
                    </Button>
                    <Button variant="outline" onClick={uploadBackupFromDevice} className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      رفع من الجهاز
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">النسخ المتاحة للاسترداد</h3>
                    {backupHistory.filter(b => b.status === 'نجح').map(backup => (
                      <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{backup.type} - {backup.date}</p>
                          <p className="text-sm text-muted-foreground">
                            الحجم: {backup.size} | الموقع: {backup.location}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadBackupToDevice(backup.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedComponents(backup.components);
                              setRestoreDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            استرداد
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>مواقع التخزين المحلي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {localStorageLocations.map(location => (
                    <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <HardDrive className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-sm text-muted-foreground">{location.path}</p>
                          <p className="text-sm text-muted-foreground">
                            متاح: {location.free} / المجموع: {location.total}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={location.enabled}
                          onCheckedChange={(checked) => {
                            setLocalStorageLocations(prev =>
                              prev.map(loc => 
                                loc.id === location.id ? { ...loc, enabled: checked } : loc
                              )
                            );
                          }}
                        />
                        <Button size="sm" variant="outline">
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cloud Tab */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>خدمات التخزين السحابي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cloudServices.map(service => {
                    const Icon = service.icon;
                    const isConnected = cloudConnections[service.id];
                    
                    return (
                      <div key={service.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 ${service.color} rounded-lg`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground">
                                مساحة مجانية: {service.freeSpace}
                              </p>
                            </div>
                          </div>
                          <Badge variant={isConnected ? 'default' : 'secondary'}>
                            {isConnected ? 'متصل' : 'غير متصل'}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          {isConnected ? (
                            <>
                              <Button size="sm" variant="outline">
                                <Settings className="h-4 w-4 mr-1" />
                                إعدادات
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => setCloudConnections(prev => ({ ...prev, [service.id]: false }))}
                              >
                                قطع الاتصال
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => connectCloudService(service.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              ربط الحساب
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>جدولة النسخ الاحتياطي التلقائي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      يمكنك جدولة النسخ الاحتياطي ليتم تلقائياً في أوقات محددة. سيتم تشغيل النسخ الاحتياطي حتى لو كان البرنامج مغلقاً.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3">نسخ احتياطي يومي</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>تفعيل النسخ اليومي</Label>
                          <Switch />
                        </div>
                        <div>
                          <Label>الوقت</Label>
                          <Input type="time" defaultValue="02:00" />
                        </div>
                        <div>
                          <Label>نوع النسخة</Label>
                          <Select defaultValue="incremental">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">كاملة</SelectItem>
                              <SelectItem value="incremental">تدريجية</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="font-semibold mb-3">نسخ احتياطي أسبوعي</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>تفعيل النسخ الأسبوعي</Label>
                          <Switch />
                        </div>
                        <div>
                          <Label>اليوم</Label>
                          <Select defaultValue="sunday">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sunday">الأحد</SelectItem>
                              <SelectItem value="monday">الاثنين</SelectItem>
                              <SelectItem value="tuesday">الثلاثاء</SelectItem>
                              <SelectItem value="wednesday">الأربعاء</SelectItem>
                              <SelectItem value="thursday">الخميس</SelectItem>
                              <SelectItem value="friday">الجمعة</SelectItem>
                              <SelectItem value="saturday">السبت</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>الوقت</Label>
                          <Input type="time" defaultValue="01:00" />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء نسخة احتياطية جديدة</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">اختر المكونات للنسخ الاحتياطي</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {systemComponents.map(component => {
                  const Icon = component.icon;
                  return (
                    <div key={component.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedComponents.includes(component.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedComponents([...selectedComponents, component.id]);
                          } else {
                            setSelectedComponents(selectedComponents.filter(id => id !== component.id));
                          }
                        }}
                      />
                      <Icon className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{component.name}</p>
                          {component.critical && <Badge variant="destructive" className="text-xs">مهم</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{component.size}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">اختر مواقع الحفظ</h3>
              <div className="space-y-3">
                {localStorageLocations.filter(l => l.enabled).map(location => (
                  <div key={location.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedBackupLocations.includes(location.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBackupLocations([...selectedBackupLocations, location.id]);
                        } else {
                          setSelectedBackupLocations(selectedBackupLocations.filter(id => id !== location.id));
                        }
                      }}
                    />
                    <HardDrive className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-muted-foreground">{location.path}</p>
                    </div>
                  </div>
                ))}
                
                {Object.entries(cloudConnections).filter(([_, connected]) => connected).map(([serviceId]) => {
                  const service = cloudServices.find(s => s.id === serviceId);
                  if (!service) return null;
                  
                  const Icon = service.icon;
                  return (
                    <div key={serviceId} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedCloudServices.includes(serviceId)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCloudServices([...selectedCloudServices, serviceId]);
                          } else {
                            setSelectedCloudServices(selectedCloudServices.filter(id => id !== serviceId));
                          }
                        }}
                      />
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">تخزين سحابي</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBackupDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={() => runBackup('full', selectedComponents, [...selectedBackupLocations, ...selectedCloudServices])}
                disabled={selectedComponents.length === 0 || (selectedBackupLocations.length === 0 && selectedCloudServices.length === 0)}
              >
                بدء النسخ الاحتياطي
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>استرداد النسخة الاحتياطية</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>تحذير:</strong> عملية الاسترداد ستستبدل البيانات الحالية. تأكد من إنشاء نسخة احتياطية قبل المتابعة.
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="text-lg font-semibold mb-4">اختر المكونات للاسترداد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {systemComponents.map(component => {
                  const Icon = component.icon;
                  return (
                    <div key={component.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={selectedComponents.includes(component.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedComponents([...selectedComponents, component.id]);
                          } else {
                            setSelectedComponents(selectedComponents.filter(id => id !== component.id));
                          }
                        }}
                      />
                      <Icon className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{component.name}</p>
                          {component.critical && <Badge variant="destructive" className="text-xs">مهم</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{component.size}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={() => restoreBackup('1', selectedComponents)}
                disabled={selectedComponents.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                بدء الاسترداد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cloudSetupDialogOpen} onOpenChange={setCloudSetupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إعداد التخزين السحابي</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <p className="text-muted-foreground">
              اربط حساباتك السحابية لحفظ النسخ الاحتياطية تلقائياً في التخزين السحابي.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cloudServices.map(service => {
                const Icon = service.icon;
                const isConnected = cloudConnections[service.id];
                
                return (
                  <div key={service.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${service.color} rounded-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            مساحة مجانية: {service.freeSpace}
                          </p>
                        </div>
                      </div>
                      <Badge variant={isConnected ? 'default' : 'secondary'}>
                        {isConnected ? 'متصل' : 'غير متصل'}
                      </Badge>
                    </div>
                    
                    {!isConnected && (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => connectCloudService(service.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        ربط الحساب
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCloudSetupDialogOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}