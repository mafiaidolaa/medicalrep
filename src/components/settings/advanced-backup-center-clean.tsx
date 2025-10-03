"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  Save,
  RotateCcw,
  Upload,
  Download,
  Cloud,
  HardDrive,
  FolderOpen,
  Settings,
  Activity,
  History,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface BackupItem {
  id: string;
  type: string;
  date: string;
  status: string;
  size: string;
}

interface CloudService {
  id: string;
  name: string;
  icon: any;
  color: string;
  freeSpace: string;
}

interface StorageLocation {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  free: string;
  total: string;
}

interface SystemComponent {
  id: string;
  name: string;
  icon: any;
  size: string;
  critical: boolean;
}

interface Schedule {
  id: string;
  name: string;
  frequency: string;
  time: string;
  enabled: boolean;
}

const AdvancedBackupCenter = () => {
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedRestoreBackups, setSelectedRestoreBackups] = useState<string[]>([]);

  // Sample data
  const backupHistory: BackupItem[] = [
    { id: '1', type: 'نسخة كاملة', date: '2024-01-15 10:30', status: 'نجح', size: '2.5 GB' },
    { id: '2', type: 'نسخة تدريجية', date: '2024-01-14 23:00', status: 'نجح', size: '150 MB' },
    { id: '3', type: 'نسخة كاملة', date: '2024-01-13 02:00', status: 'فشل', size: '0 MB' },
    { id: '4', type: 'نسخة تدريجية', date: '2024-01-12 23:00', status: 'نجح', size: '85 MB' },
  ];

  const cloudServices: CloudService[] = [
    { id: 'google', name: 'Google Drive', icon: Cloud, color: 'bg-blue-500', freeSpace: '15 GB' },
    { id: 'dropbox', name: 'Dropbox', icon: Cloud, color: 'bg-blue-600', freeSpace: '2 GB' },
    { id: 'onedrive', name: 'OneDrive', icon: Cloud, color: 'bg-blue-700', freeSpace: '5 GB' }
  ];

  const schedules: Schedule[] = [
    { id: '1', name: 'النسخ اليومي', frequency: 'يومياً', time: '02:00', enabled: true },
    { id: '2', name: 'النسخ الأسبوعي', frequency: 'أسبوعياً', time: '01:00', enabled: false },
  ];

  const stats = {
    successfulBackups: backupHistory.filter(b => b.status === 'نجح').length,
    totalBackups: backupHistory.length,
    totalSpace: '8.2 GB'
  };

  // Functions
  const startBackup = () => {
    setShowBackupDialog(false);
    setIsBackupRunning(true);
    setBackupProgress(0);
    
    toast.success('تم بدء النسخ الاحتياطي');
    
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackupRunning(false);
          toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  const startRestore = () => {
    setShowRestoreDialog(false);
    toast.success('تم بدء عملية الاسترداد');
  };

  const toggleRestoreSelection = (backupId: string) => {
    setSelectedRestoreBackups(prev => 
      prev.includes(backupId) 
        ? prev.filter(id => id !== backupId)
        : [...prev, backupId]
    );
  };

  const toggleCloudConnection = () => {
    setCloudConnected(!cloudConnected);
    toast.success(cloudConnected ? 'تم قطع الاتصال بالسحابة' : 'تم الاتصال بالسحابة');
  };

  const uploadToCloud = () => {
    toast.success('جاري رفع النسخ الاحتياطية إلى السحابة...');
  };

  const downloadFromCloud = () => {
    toast.success('جاري تحميل النسخ الاحتياطية من السحابة...');
  };

  const downloadBackupToDevice = (backupId: string) => {
    toast.success(`جاري تحميل النسخة الاحتياطية ${backupId}`);
  };

  const toggleSchedule = (scheduleId: string) => {
    toast.success('تم تحديث إعدادات الجدولة');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">مركز النسخ الاحتياطي المتقدم</h1>
          <p className="text-muted-foreground">إدارة شاملة للنسخ الاحتياطي والاسترداد</p>
        </div>
        <Button onClick={() => setShowBackupDialog(true)} className="gap-2">
          <Save className="h-4 w-4" />
          إنشاء نسخة احتياطية
        </Button>
      </div>

      {/* Progress Bar */}
      {isBackupRunning && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">جاري إنشاء النسخة الاحتياطية...</span>
              <span className="text-sm text-muted-foreground">{Math.round(backupProgress)}%</span>
            </div>
            <Progress value={backupProgress} className="h-3" />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Save className="h-4 w-4" />
            النسخ الاحتياطي
          </TabsTrigger>
          <TabsTrigger value="restore" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            الاسترداد
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            التخزين
          </TabsTrigger>
          <TabsTrigger value="cloud" className="gap-2">
            <Cloud className="h-4 w-4" />
            السحابة
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="h-4 w-4" />
            الجدولة
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                    <Badge variant="outline">{stats.totalSpace}</Badge>
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
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full Backup */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowBackupDialog(true)}>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">نسخ احتياطي كامل</h3>
                <p className="text-sm text-muted-foreground">نسخة احتياطية شاملة لجميع البيانات</p>
              </CardContent>
            </Card>

            {/* Incremental Backup */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowBackupDialog(true)}>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">نسخ احتياطي تزايدي</h3>
                <p className="text-sm text-muted-foreground">نسخ احتياطي للتغييرات الجديدة فقط</p>
              </CardContent>
            </Card>

            {/* Custom Backup */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowBackupDialog(true)}>
              <CardContent className="p-6 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                <h3 className="font-semibold mb-2">نسخ احتياطي مخصص</h3>
                <p className="text-sm text-muted-foreground">اختر البيانات المراد نسخها</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>استعادة النسخ الاحتياطية</CardTitle>
              <p className="text-sm text-muted-foreground">اختر نسخة احتياطية لاستعادتها</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backupHistory.map(backup => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedRestoreBackups.includes(backup.id)}
                        onCheckedChange={() => toggleRestoreSelection(backup.id)}
                      />
                      <div>
                        <p className="font-medium">{backup.type}</p>
                        <p className="text-sm text-muted-foreground">{backup.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={backup.status === 'نجح' ? 'default' : 'destructive'}
                        className={backup.status === 'نجح' ? 'bg-green-500' : ''}
                      >
                        {backup.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{backup.size}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => setShowRestoreDialog(true)} 
                  disabled={selectedRestoreBackups.length === 0}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  استعادة المحدد
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  التخزين المحلي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المساحة المستخدمة</span>
                    <span>8.2 GB / 50 GB</span>
                  </div>
                  <Progress value={16.4} className="h-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup-location">مجلد النسخ الاحتياطية</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="backup-location" 
                      value="C:\\Backups" 
                      readOnly 
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cloud Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  التخزين السحابي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>الحالة</span>
                  <Badge variant={cloudConnected ? 'default' : 'secondary'} className={cloudConnected ? 'bg-green-500' : ''}>
                    {cloudConnected ? 'متصل' : 'غير متصل'}
                  </Badge>
                </div>
                {cloudConnected && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>المساحة المستخدمة</span>
                      <span>3.1 GB / 15 GB</span>
                    </div>
                    <Progress value={20.7} className="h-2" />
                  </div>
                )}
                <Button 
                  variant={cloudConnected ? 'destructive' : 'default'} 
                  className="w-full"
                  onClick={toggleCloudConnection}
                >
                  {cloudConnected ? 'قطع الاتصال' : 'الاتصال بالسحابة'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cloud Tab */}
        <TabsContent value="cloud" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload to Cloud */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={uploadToCloud}>
              <CardContent className="p-6 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">رفع إلى السحابة</h3>
                <p className="text-sm text-muted-foreground">رفع النسخ الاحتياطية إلى التخزين السحابي</p>
              </CardContent>
            </Card>

            {/* Download from Cloud */}
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={downloadFromCloud}>
              <CardContent className="p-6 text-center">
                <Download className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">تحميل من السحابة</h3>
                <p className="text-sm text-muted-foreground">تحميل النسخ الاحتياطية من التخزين السحابي</p>
              </CardContent>
            </Card>
          </div>

          {/* Cloud Backups List */}
          <Card>
            <CardHeader>
              <CardTitle>النسخ الاحتياطية السحابية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backupHistory.slice(0, 2).map(backup => (
                  <div key={backup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Cloud className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium">{backup.type}</p>
                        <p className="text-sm text-muted-foreground">{backup.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{backup.size}</span>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">جدولة النسخ الاحتياطية</h2>
            <Button onClick={() => setShowScheduleDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              إضافة جدولة
            </Button>
          </div>

          <div className="grid gap-4">
            {schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${schedule.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-sm text-muted-foreground">{schedule.frequency} - {schedule.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={schedule.enabled}
                        onCheckedChange={() => toggleSchedule(schedule.id)}
                      />
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Backup Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء نسخة احتياطية</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إنشاء نسخة احتياطية جديدة؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={startBackup}>
              بدء النسخ الاحتياطي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استعادة النسخة الاحتياطية</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من استعادة النسخ الاحتياطية المحددة؟ قد يؤدي هذا إلى استبدال البيانات الحالية.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={startRestore} variant="destructive">
              استعادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة جدولة جديدة</DialogTitle>
            <DialogDescription>
              إنشاء جدولة تلقائية للنسخ الاحتياطية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">اسم الجدولة</Label>
              <Input id="schedule-name" placeholder="نسخة احتياطية يومية" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-frequency">التكرار</Label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-time">الوقت</Label>
              <Input id="schedule-time" type="time" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={() => {
              setShowScheduleDialog(false);
              toast.success('تم إنشاء الجدولة بنجاح');
            }}>
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedBackupCenter;