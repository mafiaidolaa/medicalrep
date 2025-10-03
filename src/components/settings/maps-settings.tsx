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
import { 
  MapPin, 
  Map,
  Settings,
  Globe,
  Key,
  Palette,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MapStatusChecker } from '@/components/maps-status-checker';
import { locationService } from '@/lib/location-service';

interface GoogleMapsSettings {
  enabled: boolean;
  apiKey: string;
  defaultZoom: number;
  defaultCenter: {
    lat: number;
    lng: number;
  };
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  theme: 'default' | 'dark' | 'silver' | 'retro';
  enableClustering: boolean;
  enableStreetView: boolean;
  enableFullscreen: boolean;
  enableZoomControl: boolean;
  enableMapTypeControl: boolean;
  enableScaleControl: boolean;
  language: string;
  region: string;
  // Location tracking settings
  locationTracking: {
    enabled: boolean;
    requestOnLogin: boolean;
    requestOnClinicRegistration: boolean;
    requestOnOrderCreation: boolean;
    requestOnVisitCreation: boolean;
    requestOnPayment: boolean;
    enableGeofencing: boolean;
    geofenceRadius: number;
    enableRouteTracking: boolean;
    enableActivityLogging: boolean;
    privacyMode: 'strict' | 'balanced' | 'permissive';
  };
  // Geocoding settings
  geocoding: {
    enableReverseGeocoding: boolean;
    cacheResults: boolean;
    enableAddressAutoComplete: boolean;
  };
}

const defaultSettings: GoogleMapsSettings = {
  enabled: false,
  apiKey: '',
  defaultZoom: 10,
  defaultCenter: {
    lat: 24.7136, // Riyadh coordinates for Saudi Arabia
    lng: 46.6753
  },
  mapType: 'roadmap',
  theme: 'default',
  enableClustering: true,
  enableStreetView: true,
  enableFullscreen: true,
  enableZoomControl: true,
  enableMapTypeControl: true,
  enableScaleControl: true,
  language: 'ar',
  region: 'SA',
  locationTracking: {
    enabled: true,
    requestOnLogin: true,
    requestOnClinicRegistration: true,
    requestOnOrderCreation: true,
    requestOnVisitCreation: true,
    requestOnPayment: true,
    enableGeofencing: false,
    geofenceRadius: 1.0, // 1 km
    enableRouteTracking: false,
    enableActivityLogging: true,
    privacyMode: 'balanced'
  },
  geocoding: {
    enableReverseGeocoding: true,
    cacheResults: true,
    enableAddressAutoComplete: true
  }
};

export function MapsSettings() {
  const [settings, setSettings] = useState<GoogleMapsSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string>('unknown');
  const { toast } = useToast();

  // Check location permission status
  useEffect(() => {
    const checkLocationPermission = async () => {
      const permission = locationService.getPermissionState();
      if (permission.granted) {
        setLocationPermissionStatus('granted');
      } else if (permission.denied) {
        setLocationPermissionStatus('denied');
      } else {
        setLocationPermissionStatus('prompt');
      }
    };
    checkLocationPermission();
  }, []);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from system settings
      const response = await fetch('/api/system-settings/maps');
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
      }
    } catch (error) {
      console.error('Failed to load maps settings:', error);
      toast({
        title: "خطأ في تحميل الإعدادات",
        description: "تعذر تحميل إعدادات الخرائط. سيتم استخدام القيم الافتراضية.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Save to localStorage for immediate use
      localStorage.setItem('google_maps_api_key', settings.apiKey);
      localStorage.setItem('maps_settings', JSON.stringify(settings));
      
      const response = await fetch('/api/system-settings/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Update location service config
      locationService.updateConfig({
        enableHighAccuracy: settings.locationTracking.privacyMode !== 'strict',
        enableAddressGeocoding: settings.geocoding.enableReverseGeocoding
      });

      toast({
        title: "تم حفظ الإعدادات",
        description: "تم حفظ إعدادات الخرائط بنجاح",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to save maps settings:', error);
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: "تعذر حفظ إعدادات الخرائط. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const permission = await locationService.requestLocationPermission();
      if (permission.granted) {
        setLocationPermissionStatus('granted');
        toast({
          title: "تم منح الإذن",
          description: "تم منح إذن الوصول للموقع بنجاح",
        });
      } else if (permission.denied) {
        setLocationPermissionStatus('denied');
        toast({
          title: "تم رفض الإذن",
          description: permission.error || "تم رفض إذن الوصول للموقع",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في طلب الإذن",
        description: "حدث خطأ أثناء طلب إذن الموقع",
        variant: "destructive",
      });
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setSettings({
          ...settings,
          defaultCenter: {
            lat: location.latitude,
            lng: location.longitude
          }
        });
        toast({
          title: "تم تحديث الموقع",
          description: `تم تحديث الموقع الافتراضي إلى موقعك الحالي${location.address ? `: ${location.address}` : ''}`,
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الحصول على الموقع",
        description: "تعذر الحصول على موقعك الحالي",
        variant: "destructive",
      });
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    toast({
      title: "تم إعادة تعيين الإعدادات",
      description: "تم إعادة الإعدادات إلى القيم الافتراضية",
    });
  };

  const validateApiKey = (key: string): boolean => {
    return key.length >= 30 && key.startsWith('AIza');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-3 text-lg">جاري تحميل إعدادات الخرائط...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Map className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">إعدادات خرائط جوجل</h2>
            <p className="text-muted-foreground">تكوين واجهة برمجة التطبيقات والخصائص المتقدمة للخرائط</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={settings.enabled ? "default" : "secondary"} className="px-3 py-1">
            {settings.enabled ? (
              <>
                <CheckCircle className="h-4 w-4 ml-1" />
                مفعل
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 ml-1" />
                معطل
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Map Status Checker */}
      <MapStatusChecker className="mb-6" />
      
      <div className="space-y-6">
        {/* Location Permission Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              حالة أذونات الموقع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {locationPermissionStatus === 'granted' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : locationPermissionStatus === 'denied' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <p className="font-medium">
                    {locationPermissionStatus === 'granted' ? 'تم منح الإذن' :
                     locationPermissionStatus === 'denied' ? 'تم رفض الإذن' : 'لم يُطلب الإذن بعد'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locationPermissionStatus === 'granted' ? 'يمكن للتطبيق الوصول إلى موقعك' :
                     locationPermissionStatus === 'denied' ? 'لا يمكن للتطبيق الوصول إلى موقعك' : 'اطلب الإذن لتفعيل ميزات الموقع'}
                  </p>
                </div>
              </div>
              {locationPermissionStatus !== 'granted' && (
                <Button
                  onClick={requestLocationPermission}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  طلب الإذن
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              الإعدادات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Maps */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">تفعيل الخرائط</Label>
                <p className="text-sm text-muted-foreground">تمكين أو تعطيل خرائط جوجل في النظام</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                مفتاح واجهة برمجة التطبيقات
              </Label>
              <div className="relative">
                <Input
                  type={apiKeyVisible ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="AIza..."
                  className={validateApiKey(settings.apiKey) ? "border-green-500" : settings.apiKey ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-6 px-2"
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                >
                  {apiKeyVisible ? "إخفاء" : "إظهار"}
                </Button>
              </div>
              {settings.apiKey && !validateApiKey(settings.apiKey) && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  مفتاح API غير صالح. يجب أن يبدأ بـ AIza ويحتوي على 30 حرف على الأقل
                </p>
              )}
            </div>

            {/* Language & Region */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>لغة الخرائط</Label>
                <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المنطقة</Label>
                <Select value={settings.region} onValueChange={(value) => setSettings({ ...settings, region: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EG">مصر</SelectItem>
                    <SelectItem value="SA">السعودية</SelectItem>
                    <SelectItem value="AE">الإمارات</SelectItem>
                    <SelectItem value="US">الولايات المتحدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              مظهر الخريطة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Center */}
            <div className="space-y-2">
              <Label className="text-base font-medium">المركز الافتراضي للخريطة</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">خط العرض (Latitude)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={settings.defaultCenter.lat}
                    onChange={(e) => setSettings({
                      ...settings,
                      defaultCenter: { ...settings.defaultCenter, lat: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">خط الطول (Longitude)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={settings.defaultCenter.lng}
                    onChange={(e) => setSettings({
                      ...settings,
                      defaultCenter: { ...settings.defaultCenter, lng: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    className="w-full"
                  >
                    <MapPin className="h-4 w-4 ml-2" />
                    استخدام موقعي الحالي
                  </Button>
                </div>
              </div>
            </div>

            {/* Default Zoom */}
            <div className="space-y-2">
              <Label className="text-base font-medium">مستوى التكبير الافتراضي</Label>
              <Input
                type="range"
                min="1"
                max="20"
                value={settings.defaultZoom}
                onChange={(e) => setSettings({ ...settings, defaultZoom: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground">
                المستوى الحالي: {settings.defaultZoom}
              </div>
            </div>

            {/* Map Type */}
            <div className="space-y-2">
              <Label>نوع الخريطة الافتراضي</Label>
              <Select value={settings.mapType} onValueChange={(value: any) => setSettings({ ...settings, mapType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">خريطة الطرق</SelectItem>
                  <SelectItem value="satellite">الأقمار الصناعية</SelectItem>
                  <SelectItem value="hybrid">مختلط</SelectItem>
                  <SelectItem value="terrain">التضاريس</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Map Theme */}
            <div className="space-y-2">
              <Label>ثيم الخريطة</Label>
              <Select value={settings.theme} onValueChange={(value: any) => setSettings({ ...settings, theme: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">افتراضي</SelectItem>
                  <SelectItem value="dark">داكن</SelectItem>
                  <SelectItem value="silver">فضي</SelectItem>
                  <SelectItem value="retro">كلاسيكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              الميزات المتقدمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Map Controls */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base">أدوات التحكم</h4>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">أدوات التكبير</Label>
                  <Switch
                    checked={settings.enableZoomControl}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableZoomControl: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">تحكم نوع الخريطة</Label>
                  <Switch
                    checked={settings.enableMapTypeControl}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableMapTypeControl: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">مقياس الخريطة</Label>
                  <Switch
                    checked={settings.enableScaleControl}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableScaleControl: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">وضع الشاشة الكاملة</Label>
                  <Switch
                    checked={settings.enableFullscreen}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableFullscreen: checked })}
                  />
                </div>
              </div>

              {/* Map Features */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base">ميزات الخريطة</h4>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">عرض الشارع</Label>
                  <Switch
                    checked={settings.enableStreetView}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableStreetView: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">تجميع العلامات</Label>
                  <Switch
                    checked={settings.enableClustering}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableClustering: checked })}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base">معاينة سريعة</h4>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-32 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <MapPin className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {settings.enabled ? "الخرائط مفعلة" : "الخرائط معطلة"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {settings.mapType} • تكبير {settings.defaultZoom}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Location Tracking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              إعدادات تتبع الموقع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Location Tracking */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">تفعيل تتبع الموقع</Label>
                <p className="text-sm text-muted-foreground">تمكين تسجيل المواقع مع الأنشطة</p>
              </div>
              <Switch
                checked={settings.locationTracking.enabled}
                onCheckedChange={(enabled) => setSettings({ 
                  ...settings, 
                  locationTracking: { ...settings.locationTracking, enabled } 
                })}
              />
            </div>

            {settings.locationTracking.enabled && (
              <>
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold">طلب الموقع عند:</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">تسجيل الدخول</Label>
                      <Switch
                        checked={settings.locationTracking.requestOnLogin}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, requestOnLogin: checked } 
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">تسجيل عيادة</Label>
                      <Switch
                        checked={settings.locationTracking.requestOnClinicRegistration}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, requestOnClinicRegistration: checked } 
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">إنشاء طلبية</Label>
                      <Switch
                        checked={settings.locationTracking.requestOnOrderCreation}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, requestOnOrderCreation: checked } 
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">إنشاء زيارة</Label>
                      <Switch
                        checked={settings.locationTracking.requestOnVisitCreation}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, requestOnVisitCreation: checked } 
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">دفع دين</Label>
                      <Switch
                        checked={settings.locationTracking.requestOnPayment}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, requestOnPayment: checked } 
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">تسجيل الأنشطة</Label>
                      <Switch
                        checked={settings.locationTracking.enableActivityLogging}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, enableActivityLogging: checked } 
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    إعدادات الخصوصية
                  </h4>
                  
                  <div className="space-y-2">
                    <Label>وضع الخصوصية</Label>
                    <Select 
                      value={settings.locationTracking.privacyMode} 
                      onValueChange={(value: any) => setSettings({ 
                        ...settings, 
                        locationTracking: { ...settings.locationTracking, privacyMode: value } 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">صارم - دقة منخفضة</SelectItem>
                        <SelectItem value="balanced">متوازن - دقة متوسطة</SelectItem>
                        <SelectItem value="permissive">مرن - دقة عالية</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {settings.locationTracking.privacyMode === 'strict' ? 'يستخدم دقة منخفضة لتوفير الخصوصية والبطارية' :
                       settings.locationTracking.privacyMode === 'balanced' ? 'توازن بين الدقة والخصوصية' :
                       'دقة عالية مع استهلاك أكبر للبطارية'}
                    </p>
                  </div>

                  {/* Geofencing Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">تفعيل المناطق الجغرافية</Label>
                      <Switch
                        checked={settings.locationTracking.enableGeofencing}
                        onCheckedChange={(checked) => setSettings({ 
                          ...settings, 
                          locationTracking: { ...settings.locationTracking, enableGeofencing: checked } 
                        })}
                      />
                    </div>
                    {settings.locationTracking.enableGeofencing && (
                      <div className="space-y-2">
                        <Label className="text-sm">نطاق المنطقة الجغرافية (كم)</Label>
                        <Input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={settings.locationTracking.geofenceRadius}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            locationTracking: { 
                              ...settings.locationTracking, 
                              geofenceRadius: parseFloat(e.target.value) || 1.0 
                            } 
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          المسافة التي يجب أن يكون فيها المستخدم من الموقع المحدد
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Geocoding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              إعدادات الترميز الجغرافي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">تحويل الإحداثيات إلى عناوين</Label>
                <p className="text-sm text-muted-foreground">تحويل خطوط الطول والعرض إلى عناوين قابلة للقراءة</p>
              </div>
              <Switch
                checked={settings.geocoding.enableReverseGeocoding}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  geocoding: { ...settings.geocoding, enableReverseGeocoding: checked } 
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">حفظ النتائج مؤقتاً</Label>
                <p className="text-sm text-muted-foreground">حفظ نتائج البحث لتقليل استدعاءات API</p>
              </div>
              <Switch
                checked={settings.geocoding.cacheResults}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  geocoding: { ...settings.geocoding, cacheResults: checked } 
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">الإكمال التلقائي للعناوين</Label>
                <p className="text-sm text-muted-foreground">اقتراح العناوين أثناء الكتابة</p>
              </div>
              <Switch
                checked={settings.geocoding.enableAddressAutoComplete}
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  geocoding: { ...settings.geocoding, enableAddressAutoComplete: checked } 
                })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={resetSettings}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين
          </Button>

          <Button
            onClick={saveSettings}
            disabled={isSaving || !settings.enabled || !validateApiKey(settings.apiKey)}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}