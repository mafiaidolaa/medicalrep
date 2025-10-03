"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import EnhancedGoogleMaps from '@/components/ui/enhanced-google-maps';
import { useLocationIntegration } from '@/hooks/use-location-integration';
import { getActivitiesWithLocation, type ActivityWithLocation } from '@/lib/location-service';
import { useDataProvider } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';
import { 
  Map, 
  MapPin, 
  Filter, 
  Search, 
  Calendar, 
  Users, 
  Building, 
  ShoppingBag, 
  UserCheck, 
  CreditCard,
  Activity,
  Route,
  Target,
  BarChart3,
  PieChart,
  TrendingUp,
  RefreshCw,
  Download,
  Settings,
  Eye,
  EyeOff,
  Navigation,
  Layers,
  Clock
} from 'lucide-react';

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  type: 'clinic' | 'user' | 'visit' | 'order' | 'activity' | 'payment' | 'failed_activity';
  data?: any;
  color?: string;
  timestamp?: number;
}

interface FilterSettings {
  showClinics: boolean;
  showActivities: boolean;
  showVisits: boolean;
  showOrders: boolean;
  showPayments: boolean;
  dateRange: 'today' | 'week' | 'month' | 'all';
  userFilter: string;
  searchTerm: string;
}

export function InteractiveMapsDashboard() {
  const { clinics, users } = useDataProvider();
  const { getCurrentLocation, isLocationAvailable } = useLocationIntegration();
  const [activities, setActivities] = useState<ActivityWithLocation[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [filters, setFilters] = useState<FilterSettings>({
    showClinics: true,
    showActivities: true,
    showVisits: true,
    showOrders: true,
    showPayments: true,
    dateRange: 'week',
    userFilter: 'all',
    searchTerm: ''
  });

  const [viewMode, setViewMode] = useState<'map' | 'analytics'>('map');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 24.7136, // Riyadh default
    lng: 46.6753
  });

  // Load activities on mount
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const locationActivities = await getActivitiesWithLocation();
        setActivities(locationActivities);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
    // Refresh every minute
    const interval = setInterval(loadActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Date range filter
    const now = Date.now();
    const dateRanges = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity
    };

    const rangeMs = dateRanges[filters.dateRange];
    if (rangeMs !== Infinity) {
      filtered = filtered.filter(activity => now - activity.timestamp <= rangeMs);
    }

    // Activity type filter
    filtered = filtered.filter(activity => {
      switch (activity.type) {
        case 'login':
          return filters.showActivities;
        case 'clinic_registration':
          return filters.showClinics;
        case 'visit':
          return filters.showVisits;
        case 'order':
          return filters.showOrders;
        case 'payment':
          return filters.showPayments;
        default:
          return true;
      }
    });

    // User filter
    if (filters.userFilter !== 'all') {
      filtered = filtered.filter(activity => activity.userId === filters.userFilter);
    }

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.details?.clinicName?.toLowerCase().includes(searchLower) ||
        activity.details?.description?.toLowerCase().includes(searchLower) ||
        activity.location?.address?.toLowerCase().includes(searchLower) ||
        activity.location?.city?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [activities, filters]);

  // Generate map markers from filtered data
  const mapMarkers = useMemo(() => {
    const markers: MapMarker[] = [];

    // Add clinic markers
    if (filters.showClinics) {
      clinics.forEach(clinic => {
        if (clinic.lat && clinic.lng) {
          markers.push({
            id: `clinic-${clinic.id}`,
            position: { lat: clinic.lat, lng: clinic.lng },
            title: clinic.name,
            type: 'clinic',
            data: {
              ...clinic,
              address: clinic.address,
              description: `د. ${clinic.doctorName} - ${clinic.clinicPhone || 'لا يوجد هاتف'}`
            },
            color: '#10b981'
          });
        }
      });
    }

    // Add activity markers
    filteredActivities.forEach(activity => {
      if (activity.location) {
        const activityTypeNames = {
          login: 'تسجيل دخول',
          clinic_registration: 'تسجيل عيادة',
          order: 'طلبية',
          visit: 'زيارة',
          payment: 'دفع'
        };

        const colors = {
          login: '#3b82f6',
          clinic_registration: '#10b981',
          order: '#8b5cf6',
          visit: '#f59e0b',
          payment: '#ef4444'
        };

        const user = users.find(u => u.id === activity.userId);

        markers.push({
          id: `activity-${activity.id}`,
          position: { 
            lat: activity.location.latitude, 
            lng: activity.location.longitude 
          },
          title: `${activityTypeNames[activity.type]} - ${user?.fullName || 'مستخدم'}`,
          type: 'activity',
          data: {
            ...activity,
            userName: user?.fullName,
            activityTypeName: activityTypeNames[activity.type],
            address: activity.location.address,
            description: `${new Date(activity.timestamp).toLocaleString('ar-EG')} - ${activity.location.city || ''}`
          },
          color: colors[activity.type],
          timestamp: activity.timestamp
        });
      }
    });

    return markers;
  }, [filteredActivities, clinics, users, filters.showClinics]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const total = filteredActivities.length;
    const byType = filteredActivities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byUser = filteredActivities.reduce((acc, activity) => {
      const user = users.find(u => u.id === activity.userId);
      const userName = user?.fullName || 'مستخدم غير معروف';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byLocation = filteredActivities.reduce((acc, activity) => {
      const city = activity.location?.city || 'موقع غير محدد';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const withLocation = filteredActivities.filter(a => a.location).length;
    const locationPercentage = total > 0 ? Math.round((withLocation / total) * 100) : 0;

    return {
      total,
      byType,
      byUser,
      byLocation,
      withLocation,
      locationPercentage
    };
  }, [filteredActivities, users]);

  // Handle marker click
  const handleMarkerClick = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker);
  }, []);

  // Handle map click
  const handleMapClick = useCallback((position: { lat: number; lng: number }) => {
    setSelectedMarker(null);
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const locationActivities = await getActivitiesWithLocation();
      setActivities(locationActivities);
      toast({
        title: "تم تحديث البيانات",
        description: `تم تحميل ${locationActivities.length} نشاط`
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Center on current location
  const centerOnCurrentLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        toast({
          title: "تم توسيط الخريطة",
          description: "تم توسيط الخريطة على موقعك الحالي"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الموقع",
        description: "تعذر الحصول على موقعك الحالي",
        variant: "destructive"
      });
    }
  }, [getCurrentLocation, toast]);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-green-600 rounded-xl shadow-lg">
            <Map className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة الخرائط التفاعلية</h1>
            <p className="text-muted-foreground">
              عرض شامل للعيادات والأنشطة على الخريطة مع إمكانات التحليل المتقدمة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          
          <Button onClick={centerOnCurrentLocation} variant="outline" size="sm">
            <Navigation className="h-4 w-4 ml-2" />
            موقعي
          </Button>

          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsList>
              <TabsTrigger value="map">
                <Map className="h-4 w-4 ml-2" />
                خريطة
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 ml-2" />
                تحليلات
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              عوامل التصفية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="space-y-2">
              <Label>البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ابحث في العيادات أو الأنشطة..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>الفترة الزمنية</Label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value: any) => setFilters({ ...filters, dateRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">هذا الأسبوع</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="all">جميع الأوقات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <Label>المستخدم</Label>
              <Select 
                value={filters.userFilter} 
                onValueChange={(value) => setFilters({ ...filters, userFilter: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Show/Hide Controls */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">عرض على الخريطة</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-green-600" />
                    <Label className="text-sm">العيادات</Label>
                  </div>
                  <Switch
                    checked={filters.showClinics}
                    onCheckedChange={(checked) => setFilters({ ...filters, showClinics: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm">الأنشطة العامة</Label>
                  </div>
                  <Switch
                    checked={filters.showActivities}
                    onCheckedChange={(checked) => setFilters({ ...filters, showActivities: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-yellow-600" />
                    <Label className="text-sm">الزيارات</Label>
                  </div>
                  <Switch
                    checked={filters.showVisits}
                    onCheckedChange={(checked) => setFilters({ ...filters, showVisits: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-purple-600" />
                    <Label className="text-sm">الطلبيات</Label>
                  </div>
                  <Switch
                    checked={filters.showOrders}
                    onCheckedChange={(checked) => setFilters({ ...filters, showOrders: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-red-600" />
                    <Label className="text-sm">المدفوعات</Label>
                  </div>
                  <Switch
                    checked={filters.showPayments}
                    onCheckedChange={(checked) => setFilters({ ...filters, showPayments: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <Separator />
            <div className="space-y-2">
              <Label className="text-base font-semibold">إحصائيات سريعة</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-bold text-lg">{mapMarkers.length}</div>
                  <div className="text-xs text-muted-foreground">نقطة على الخريطة</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-bold text-lg">{analyticsData.total}</div>
                  <div className="text-xs text-muted-foreground">نشاط مسجل</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-bold text-lg">{clinics.filter(c => c.lat && c.lng).length}</div>
                  <div className="text-xs text-muted-foreground">عيادة محددة الموقع</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-bold text-lg">{analyticsData.locationPercentage}%</div>
                  <div className="text-xs text-muted-foreground">أنشطة مع موقع</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {viewMode === 'map' ? (
            <>
              {/* Map */}
              <Card>
                <CardContent className="p-0">
                  <EnhancedGoogleMaps
                    height="600px"
                    markers={mapMarkers}
                    center={mapCenter}
                    onMarkerClick={handleMarkerClick}
                    onMapClick={handleMapClick}
                    showCurrentLocation={isLocationAvailable()}
                    clustered={true}
                  />
                </CardContent>
              </Card>

              {/* Selected Marker Details */}
              {selectedMarker && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      تفاصيل الموقع المحدد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{selectedMarker.title}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {selectedMarker.type === 'clinic' ? 'عيادة' : 
                               selectedMarker.type === 'activity' ? 'نشاط' : selectedMarker.type}
                            </Badge>
                          </div>
                          
                          {selectedMarker.data?.address && (
                            <p><strong>العنوان:</strong> {selectedMarker.data.address}</p>
                          )}
                          
                          {selectedMarker.data?.description && (
                            <p><strong>التفاصيل:</strong> {selectedMarker.data.description}</p>
                          )}

                          {selectedMarker.timestamp && (
                            <p><strong>التوقيت:</strong> {new Date(selectedMarker.timestamp).toLocaleString('ar-EG')}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm">
                            <strong>الإحداثيات:</strong><br />
                            {selectedMarker.position.lat.toFixed(6)}, {selectedMarker.position.lng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            /* Analytics View */
            <div className="space-y-6">
              {/* Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">إجمالي الأنشطة</p>
                        <p className="text-2xl font-bold">{analyticsData.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">مع موقع جغرافي</p>
                        <p className="text-2xl font-bold">{analyticsData.withLocation}</p>
                        <p className="text-xs text-green-600">{analyticsData.locationPercentage}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">العيادات المسجلة</p>
                        <p className="text-2xl font-bold">{clinics.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">المستخدمين النشطين</p>
                        <p className="text-2xl font-bold">{Object.keys(analyticsData.byUser).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Types */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      الأنشطة حسب النوع
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.byType).map(([type, count]) => {
                        const typeNames: Record<string, string> = {
                          login: 'تسجيل دخول',
                          clinic_registration: 'تسجيل عيادة',
                          order: 'طلبية',
                          visit: 'زيارة',
                          payment: 'دفع'
                        };
                        const percentage = Math.round((count / analyticsData.total) * 100);
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm">{typeNames[type] || type}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Locations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      أكثر المواقع نشاطاً
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analyticsData.byLocation)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([location, count]) => {
                          const percentage = Math.round((count / analyticsData.total) * 100);
                          return (
                            <div key={location} className="flex items-center justify-between">
                              <span className="text-sm truncate flex-1">{location}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-600 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-8 text-right">{count}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activities List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    الأنشطة الأخيرة مع الموقع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredActivities
                        .filter(activity => activity.location)
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 20)
                        .map(activity => {
                          const user = users.find(u => u.id === activity.userId);
                          const typeNames: Record<string, string> = {
                            login: 'تسجيل دخول',
                            clinic_registration: 'تسجيل عيادة',
                            order: 'طلبية',
                            visit: 'زيارة',
                            payment: 'دفع'
                          };
                          return (
                            <div key={activity.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeNames[activity.type]}
                                </Badge>
                                <span>{user?.fullName || 'مستخدم'}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(activity.timestamp).toLocaleString('ar-EG')}
                                </div>
                                {activity.location?.city && (
                                  <div className="text-xs">{activity.location.city}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}