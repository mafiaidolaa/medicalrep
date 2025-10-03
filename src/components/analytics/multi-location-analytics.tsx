"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultiSelectLocations } from "@/components/ui/multi-select-locations";
import { useMultiLocationData } from "@/lib/multi-location-data-provider";
import { 
  Building2, MapPin, Star, TrendingUp, Users, 
  ShoppingCart, Activity, BarChart3, PieChart,
  Download, Filter, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, ResponsiveContainer
} from 'recharts';

interface LocationAnalyticsData {
  location: string;
  clinicsCount: number;
  usersCount: number;
  ordersCount: number;
  visitsCount: number;
  totalRevenue: number;
  isPrimary: boolean;
}

interface MultiLocationAnalyticsProps {
  allowExport?: boolean;
  showComparisons?: boolean;
}

export const MultiLocationAnalytics: React.FC<MultiLocationAnalyticsProps> = ({
  allowExport = true,
  showComparisons = true
}) => {
  const {
    getAllClinics,
    getAllUsers,
    getAllOrders,
    getAllAreas,
    currentUser,
    userLocations,
    filterClinicsByLocation,
    filterUsersByLocation,
    isLoading
  } = useMultiLocationData();

  const [selectedAnalysisLocations, setSelectedAnalysisLocations] = useState<string[]>(userLocations);
  const [analyticsData, setAnalyticsData] = useState<LocationAnalyticsData[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const allAreas = getAllAreas();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Load analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setIsLoadingAnalytics(true);
        
        const [allClinics, allUsers, allOrders] = await Promise.all([
          getAllClinics(),
          getAllUsers(),
          getAllOrders()
        ]);

        // Calculate analytics for each location
        const locationAnalytics: LocationAnalyticsData[] = [];
        
        const locationsToAnalyze = selectedAnalysisLocations.length > 0 
          ? selectedAnalysisLocations 
          : (currentUser?.role === 'admin' ? allAreas : userLocations);

        for (const location of locationsToAnalyze) {
          // Filter data by location
          const locationClinics = filterClinicsByLocation(allClinics, [location]);
          const locationUsers = filterUsersByLocation(allUsers, [location]);
          
          // Get clinic IDs for this location
          const locationClinicIds = new Set(locationClinics.map(c => c.id));
          const locationOrders = allOrders.filter(order => 
            locationClinicIds.has(order.clinic_id)
          );

          // Calculate revenue (assuming orders have a total field)
          const totalRevenue = locationOrders.reduce((sum, order) => 
            sum + (order.total || 0), 0
          );

          // Check if this is user's primary location
          const isPrimary = location === userLocations[0];

          locationAnalytics.push({
            location,
            clinicsCount: locationClinics.length,
            usersCount: locationUsers.length,
            ordersCount: locationOrders.length,
            visitsCount: 0, // Will be calculated from visits data if available
            totalRevenue,
            isPrimary
          });
        }

        setAnalyticsData(locationAnalytics);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    loadAnalyticsData();
  }, [
    selectedAnalysisLocations, 
    getAllClinics, 
    getAllUsers, 
    getAllOrders,
    allAreas,
    currentUser?.role,
    userLocations,
    filterClinicsByLocation,
    filterUsersByLocation
  ]);

  // Chart data
  const barChartData = useMemo(() => 
    analyticsData.map(item => ({
      location: item.location,
      عيادات: item.clinicsCount,
      مستخدمين: item.usersCount,
      طلبات: item.ordersCount,
      إيرادات: Math.round(item.totalRevenue / 1000) // Convert to thousands
    }))
  , [analyticsData]);

  const pieChartData = useMemo(() => 
    analyticsData.map(item => ({
      name: item.location,
      value: item.clinicsCount,
      isPrimary: item.isPrimary
    }))
  , [analyticsData]);

  const totalStats = useMemo(() => ({
    totalClinics: analyticsData.reduce((sum, item) => sum + item.clinicsCount, 0),
    totalUsers: analyticsData.reduce((sum, item) => sum + item.usersCount, 0),
    totalOrders: analyticsData.reduce((sum, item) => sum + item.ordersCount, 0),
    totalRevenue: analyticsData.reduce((sum, item) => sum + item.totalRevenue, 0),
    locationsCount: analyticsData.length
  }), [analyticsData]);

  const handleExport = () => {
    const csvContent = [
      ['المنطقة', 'العيادات', 'المستخدمين', 'الطلبات', 'الإيرادات', 'رئيسي'],
      ...analyticsData.map(item => [
        item.location,
        item.clinicsCount,
        item.usersCount,
        item.ordersCount,
        item.totalRevenue,
        item.isPrimary ? 'نعم' : 'لا'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || isLoadingAnalytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="mr-2">جاري تحميل التحليلات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            تحليلات المواقع المتعددة
            {currentUser?.role !== 'admin' && (
              <Badge variant="outline" className="text-xs">
                حسب مواقعك
              </Badge>
            )}
          </h2>
          <p className="text-gray-600 mt-1">
            تحليلات شاملة لجميع المواقع والعمليات
          </p>
        </div>

        <div className="flex gap-2">
          {allowExport && (
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 ml-2" />
              تصدير التقرير
            </Button>
          )}
        </div>
      </div>

      {/* Location Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Filter className="w-4 h-4" />
            فلترة التحليلات حسب المنطقة
          </div>
          
          <MultiSelectLocations
            locations={currentUser?.role === 'admin' ? allAreas : userLocations}
            selectedLocations={selectedAnalysisLocations}
            onSelectionChange={setSelectedAnalysisLocations}
            label=""
            placeholder="اختر المناطق للتحليل"
            showPrimary={false}
          />
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalStats.locationsCount}</p>
                <p className="text-sm text-gray-600">منطقة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{totalStats.totalClinics}</p>
                <p className="text-sm text-gray-600">عيادة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">{totalStats.totalUsers}</p>
                <p className="text-sm text-gray-600">مستخدم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{totalStats.totalOrders}</p>
                <p className="text-sm text-gray-600">طلب</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {Math.round(totalStats.totalRevenue / 1000)}K
                </p>
                <p className="text-sm text-gray-600">إيرادات (ج.م)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              مقارنة المواقع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="عيادات" fill="#8884d8" />
                <Bar dataKey="مستخدمين" fill="#82ca9d" />
                <Bar dataKey="طلبات" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              توزيع العيادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="value"
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isPrimary ? '#0088FE' : COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            تفاصيل المواقع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-right p-3">المنطقة</th>
                  <th className="text-center p-3">العيادات</th>
                  <th className="text-center p-3">المستخدمين</th>
                  <th className="text-center p-3">الطلبات</th>
                  <th className="text-center p-3">الإيرادات</th>
                  <th className="text-center p-3">النوع</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.map((item, index) => (
                  <tr key={item.location} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {item.location}
                        {item.isPrimary && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </td>
                    <td className="text-center p-3 font-medium">{item.clinicsCount}</td>
                    <td className="text-center p-3">{item.usersCount}</td>
                    <td className="text-center p-3">{item.ordersCount}</td>
                    <td className="text-center p-3">
                      {item.totalRevenue.toLocaleString('ar-EG', {
                        style: 'currency',
                        currency: 'EGP',
                        minimumFractionDigits: 0
                      })}
                    </td>
                    <td className="text-center p-3">
                      <Badge 
                        variant={item.isPrimary ? "default" : "outline"}
                        className={item.isPrimary ? "bg-blue-500" : ""}
                      >
                        {item.isPrimary ? 'رئيسي' : 'ثانوي'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};