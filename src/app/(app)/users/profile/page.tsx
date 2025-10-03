"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Bell, 
  Globe, 
  Palette,
  Shield,
  Save,
  Upload,
  Crop,
  Settings,
  Languages,
  Smartphone,
  Monitor,
  Check,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  primaryPhone: string;
  whatsappPhone: string;
  altPhone: string;
  area: string;
  line: string;
  profilePicture: string;
  role: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  systemUpdates: boolean;
  reportReminders: boolean;
}

interface LanguagePreferences {
  language: 'ar' | 'en';
  dateFormat: 'arabic' | 'gregorian';
  numberFormat: 'arabic' | 'english';
  timeFormat: '12h' | '24h';
}

type Theme = 'professional' | 'glassy' | 'dark' | 'orange-neon' | 'blue-sky' | 'ios-like' | 'emerald-garden' | 'royal-purple' | 'sunset-bliss' | 'ocean-deep';

const themeOptions = [
  { key: 'professional' as Theme, nameAr: 'احترافي', icon: Monitor, color: '#1e3a8a' },
  { key: 'dark' as Theme, nameAr: 'داكن', icon: Eye, color: '#0f172a' },
  { key: 'glassy' as Theme, nameAr: 'زجاجي', icon: Eye, color: '#06b6d4' },
  { key: 'orange-neon' as Theme, nameAr: 'برتقالي نيون', icon: RefreshCw, color: '#ff9500' },
  { key: 'blue-sky' as Theme, nameAr: 'السماء الزرقاء', icon: Globe, color: '#0ea5e9' },
  { key: 'ios-like' as Theme, nameAr: 'أسلوب iOS', icon: Smartphone, color: '#007aff' },
  { key: 'emerald-garden' as Theme, nameAr: 'حديقة الزمرد', icon: MapPin, color: '#10b981' },
  { key: 'royal-purple' as Theme, nameAr: 'البنفسجي الملكي', icon: Palette, color: '#8b5cf6' },
  { key: 'sunset-bliss' as Theme, nameAr: 'نعيم الغروب', icon: Camera, color: '#f59e0b' },
  { key: 'ocean-deep' as Theme, nameAr: 'أعماق المحيط', icon: Globe, color: '#0891b2' }
];

export default function ProfilePage() {
  const { toast } = useToast();
  const { theme: currentTheme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Mock current user data
  const [profileData, setProfileData] = useState<ProfileData>({
    id: '1',
    fullName: 'أحمد محمد السعيد',
    username: 'admin',
    email: 'admin@clinicconnect.com',
    primaryPhone: '+966501234567',
    whatsappPhone: '+966501234567',
    altPhone: '+966509876543',
    area: 'الرياض',
    line: 'الخط الأول',
    profilePicture: '',
    role: 'admin'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    systemUpdates: true,
    reportReminders: true
  });

  const [languagePreferences, setLanguagePreferences] = useState<LanguagePreferences>({
    language: 'ar',
    dateFormat: 'gregorian',
    numberFormat: 'english',
    timeFormat: '12h'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
        setProfileData({ ...profileData, profilePicture: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'تم حفظ البيانات',
        description: 'تم تحديث معلومات الملف الشخصي بنجاح',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في حفظ البيانات',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'تم حفظ الإعدادات',
        description: 'تم تحديث إعدادات الإشعارات بنجاح',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في حفظ إعدادات الإشعارات',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSave = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'تم حفظ الإعدادات',
        description: 'تم تحديث تفضيلات اللغة بنجاح',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في حفظ تفضيلات اللغة',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    const themeName = themeOptions.find(t => t.key === newTheme)?.nameAr;
    toast({
      title: 'تم تغيير الثيم',
      description: `تم تطبيق ثيم ${themeName}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <p className="text-muted-foreground">إدارة معلوماتك الشخصية وإعداداتك</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            المعلومات الشخصية
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            اللغة والتفضيلات
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            الثيمات والمظهر
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                المعلومات الأساسية
              </CardTitle>
              <CardDescription>
                تحديث معلوماتك الشخصية وصورتك الشخصية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={previewImage || profileData.profilePicture} />
                  <AvatarFallback className="text-lg">
                    {profileData.fullName.split(' ')[0]?.[0] || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div>
                    <Label>الصورة الشخصية</Label>
                    <p className="text-sm text-muted-foreground">
                      اختر صورة شخصية واضحة بحجم أقصاه 5MB
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      رفع صورة
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <Crop className="h-4 w-4 mr-2" />
                      اقتصاص
                    </Button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <Separator />

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder="اسم المستخدم"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="pl-10"
                      placeholder="example@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryPhone">رقم الهاتف الأساسي</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="primaryPhone"
                      value={profileData.primaryPhone}
                      onChange={(e) => setProfileData({ ...profileData, primaryPhone: e.target.value })}
                      className="pl-10"
                      placeholder="+966501234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsappPhone">رقم الواتساب</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="whatsappPhone"
                      value={profileData.whatsappPhone}
                      onChange={(e) => setProfileData({ ...profileData, whatsappPhone: e.target.value })}
                      className="pl-10"
                      placeholder="+966501234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altPhone">رقم هاتف بديل</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="altPhone"
                      value={profileData.altPhone}
                      onChange={(e) => setProfileData({ ...profileData, altPhone: e.target.value })}
                      className="pl-10"
                      placeholder="+966509876543"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">المنطقة</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="area"
                      value={profileData.area}
                      onChange={(e) => setProfileData({ ...profileData, area: e.target.value })}
                      className="pl-10"
                      placeholder="الرياض"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line">الخط</Label>
                  <Input
                    id="line"
                    value={profileData.line}
                    onChange={(e) => setProfileData({ ...profileData, line: e.target.value })}
                    placeholder="الخط الأول"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSave} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                إعدادات الإشعارات
              </CardTitle>
              <CardDescription>
                تخصيص طريقة استلام الإشعارات والتنبيهات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">إشعارات البريد الإلكتروني</Label>
                    <p className="text-sm text-muted-foreground">
                      استلام الإشعارات عبر البريد الإلكتروني
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">إشعارات الرسائل النصية (SMS)</Label>
                    <p className="text-sm text-muted-foreground">
                      استلام الإشعارات عبر الرسائل النصية
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, smsNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">الإشعارات المنبثقة</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض الإشعارات في المتصفح أو التطبيق
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">تحديثات النظام</Label>
                    <p className="text-sm text-muted-foreground">
                      إشعارات حول التحديثات والصيانة
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemUpdates}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, systemUpdates: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">تذكيرات التقارير</Label>
                    <p className="text-sm text-muted-foreground">
                      تذكيرات بمواعيد إعداد التقارير
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.reportReminders}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, reportReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">الرسائل التسويقية</Label>
                    <p className="text-sm text-muted-foreground">
                      عروض ومعلومات تسويقية من الشركة
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({ ...notificationSettings, marketingEmails: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNotificationSave} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language & Preferences Tab */}
        <TabsContent value="language" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                اللغة والتفضيلات
              </CardTitle>
              <CardDescription>
                تخصيص لغة النظام وتفضيلات العرض
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>لغة النظام</Label>
                  <Select
                    value={languagePreferences.language}
                    onValueChange={(value: 'ar' | 'en') => 
                      setLanguagePreferences({ ...languagePreferences, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تنسيق التاريخ</Label>
                  <Select
                    value={languagePreferences.dateFormat}
                    onValueChange={(value: 'arabic' | 'gregorian') => 
                      setLanguagePreferences({ ...languagePreferences, dateFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gregorian">الميلادي</SelectItem>
                      <SelectItem value="arabic">الهجري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تنسيق الأرقام</Label>
                  <Select
                    value={languagePreferences.numberFormat}
                    onValueChange={(value: 'arabic' | 'english') => 
                      setLanguagePreferences({ ...languagePreferences, numberFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">إنجليزي (1234)</SelectItem>
                      <SelectItem value="arabic">عربي (١٢٣٤)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تنسيق الوقت</Label>
                  <Select
                    value={languagePreferences.timeFormat}
                    onValueChange={(value: '12h' | '24h') => 
                      setLanguagePreferences({ ...languagePreferences, timeFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 ساعة (AM/PM)</SelectItem>
                      <SelectItem value="24h">24 ساعة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleLanguageSave} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'جاري الحفظ...' : 'حفظ التفضيلات'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Themes & Appearance Tab */}
        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                الثيمات والمظهر
              </CardTitle>
              <CardDescription>
                اختر الثيم المناسب لتخصيص مظهر النظام حسب تفضيلاتك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Theme */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {(() => {
                    const current = themeOptions.find(t => t.key === currentTheme);
                    const Icon = current?.icon || Palette;
                    return (
                      <>
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md" 
                          style={{ backgroundColor: current?.color }}
                        />
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium">الثيم الحالي</div>
                          <div className="text-sm text-muted-foreground">{current?.nameAr}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <Badge variant="secondary">نشط</Badge>
              </div>
              
              {/* Theme Selection Grid */}
              <div>
                <Label className="text-base font-medium mb-4 block">اختر ثيماً جديداً</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isCurrent = currentTheme === option.key;
                    
                    return (
                      <Card 
                        key={option.key}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md p-4",
                          isCurrent && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => handleThemeChange(option.key)}
                      >
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div 
                            className="w-12 h-12 rounded-full border-2 border-white shadow-md flex items-center justify-center" 
                            style={{ backgroundColor: option.color }}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{option.nameAr}</div>
                            {isCurrent && (
                              <div className="flex items-center justify-center mt-1">
                                <Check className="h-3 w-3 text-primary" />
                                <span className="text-xs text-primary mr-1">محدد</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              {/* Theme Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">معلومة مفيدة</h4>
                    <p className="text-sm text-blue-700">
                      يمكنك تغيير الثيم في أي وقت. سيتم حفظ اختيارك تلقائياً وتطبيقه على جميع صفحات النظام.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
