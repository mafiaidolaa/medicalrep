"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { customersService, invoicesService, paymentsService, receivablesService } from '@/lib/accounts';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  Building, 
  Calendar, 
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  UserCheck,
  AlertTriangle,
  Globe,
  Briefcase,
  CreditCard,
  Eye,
  Search,
  PhoneCall,
  MessageCircle,
  Star,
  Trash2
} from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import GoogleMap from '@/components/GoogleMap';
import { Skeleton } from '@/components/ui/skeleton';
import i18n from '@/lib/i18n';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { useTranslation } from 'react-i18next';
import { openPrintWindowForElement, exportPDF as exportPDFUtil } from '@/lib/print-utils';

interface ClinicStatistics {
  totalVisits: number;
  totalOrders: number;
  totalSpent: number;
  totalDebt: number;
  lastVisitDate: string | null;
  lastOrderDate: string | null;
  visitTrend: 'up' | 'down' | 'neutral';
  orderTrend: 'up' | 'down' | 'neutral';
  registeredBy: {
    id: string;
    name: string;
    role: string;
    registrationDate: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  } | null;
}

export default function ClinicProfilePage() {
  const params = useParams();
  const router = useRouter();
  
  if (!params) {
    return <div>Loading...</div>;
  }
  
  const clinicId = params.id as string;
  
  const { 
    clinics, 
    getClinics,
    visits, 
    orders, 
    collections,
    users,
    products,
    currentUser,
    isLoading, 
    isClient,
    addVisit,
    addPlanTask,
    addOrder,
    addCollection,
    addDebt,
    getProducts,
  } = useDataProvider();

  const [mapsSettings] = useState({
    googleMapsEnabled: true, // In production, fetch from settings
    apiKey: '', // In production, fetch from settings
  });
  
  const [fetchingClinic, setFetchingClinic] = useState(false);
  const [clinicFromApi, setClinicFromApi] = useState<any>(null);
  // Guard to prevent infinite re-fetch when clinic is not found
  const triedFetchRef = React.useRef(false);
  // Guard to avoid repeatedly calling getClinics when list is empty
  const clinicsLoadTriedRef = React.useRef(false);

  // Quick Actions dialog state and form fields
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);

  // Schedule Visit fields
  const [visitPurpose, setVisitPurpose] = useState<string>('visit');
  const [visitDate, setVisitDate] = useState<string>(''); // ISO date input value
  const [visitTime, setVisitTime] = useState<string>(''); // HH:mm
  const [visitNotes, setVisitNotes] = useState<string>('');

  // Create Order fields (simple quick builder)
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderQty, setOrderQty] = useState<number>(1);
  const [orderItems, setOrderItems] = useState<{ productId: string; productName: string; quantity: number; price: number }[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'pending' | 'approved' | 'temp_invoice' | 'final_invoice' | 'cancelled'>('pending');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [orderDateOnly, setOrderDateOnly] = useState<string>('');
  const [orderTimeOnly, setOrderTimeOnly] = useState<string>('');
  const [orderDueDate, setOrderDueDate] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'immediate' | 'credit'>('immediate');
  const [orderCustomerId, setOrderCustomerId] = useState<string>('');
  const [customersCache, setCustomersCache] = useState<{ id: string; name: string; customer_code: string }[]>([]);

  // Record Collection fields
  const [collectionAmount, setCollectionAmount] = useState<number>(0);
  const [collectionDate, setCollectionDate] = useState<string>('');
  const [collectionMethod, setCollectionMethod] = useState<'cash' | 'check' | 'bank_transfer'>('cash');
  const [collectionNotes, setCollectionNotes] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Add Old Debt fields
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [debtDueDate, setDebtDueDate] = useState<string>('');
  const [debtStatus, setDebtStatus] = useState<string>('current');
  const [debtNotes, setDebtNotes] = useState<string>('');

  const { toast } = useToast();

  // محمل بيانات للطلب السريع: يجلب المنتجات والعملاء النشطين
  function OrderDialogDataLoader({ onLoadedCustomers }: { onLoadedCustomers?: (list: any[]) => void }) {
    React.useEffect(() => {
      // تحميل المنتجات
      try { getProducts(); } catch {}
      // تحميل العملاء من الحسابات
      customersService.getActiveCustomers()
        .then((list) => {
          const mapped = (list || []).map((c: any) => ({ id: c.id, name: c.name, customer_code: c.customer_code }));
          setCustomersCache(mapped);
          onLoadedCustomers?.(mapped);
        })
        .catch(() => {});
    }, []);
    return null;
  }

  // Try to get clinic from cache first, then from API if not found
  const clinic = useMemo(() => {
    const cachedClinic = clinics.find(c => c.id === clinicId);
    if (cachedClinic) return cachedClinic;
    return clinicFromApi;
  }, [clinics, clinicId, clinicFromApi]);
  
  // Fetch clinic directly from API if not in cache
  React.useEffect(() => {
    if (!isClient) return;
    
    const cachedClinic = clinics.find(c => c.id === clinicId);
    if (cachedClinic) {
      console.log('✅ Clinic found in cache:', cachedClinic.name);
      return;
    }
    
    // Not in cache - fetch from API once (guard with localStorage across remounts/HMR)
    if (!fetchingClinic && !clinicFromApi && !triedFetchRef.current) {
      // Cross-instance guard: avoid repeated fetch spam if this component keeps remounting
      try {
        const guardKey = `clinic_fetch_guard_${clinicId}`;
        const raw = localStorage.getItem(guardKey);
        const now = Date.now();
        if (raw) {
          const last = parseInt(raw, 10);
          // Skip if last attempt was within the past 60 seconds
          if (!Number.isNaN(last) && (now - last) < 60_000) {
            console.warn('⏭️ Skipping clinic fetch due to recent attempt guard');
            return;
          }
        }
        localStorage.setItem(guardKey, String(now));
      } catch {}

      triedFetchRef.current = true;
      setFetchingClinic(true);
      console.log('⚠️ Clinic not in cache, fetching from API (once)...');
      
      fetch(`/api/clinics?id=${encodeURIComponent(clinicId)}`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const rawClinic = data[0];
            // Transform to app format
            const transformedClinic = {
              id: rawClinic.id,
              name: rawClinic.name,
              doctorName: rawClinic.doctor_name,
              address: rawClinic.address,
              lat: rawClinic.lat,
              lng: rawClinic.lng,
              registeredAt: rawClinic.registered_at,
              clinicPhone: rawClinic.clinic_phone,
              doctorPhone: rawClinic.doctor_phone,
              area: rawClinic.area,
              line: rawClinic.line,
              classification: rawClinic.classification,
              creditStatus: rawClinic.credit_status,
            };
            console.log('✅ Clinic fetched from API:', transformedClinic.name);
            setClinicFromApi(transformedClinic);
          } else {
            console.warn('❌ Clinic not found in API response - will not retry');
            setClinicFromApi(null);
          }
        })
        .catch(err => {
          console.error('❌ Failed to fetch clinic from API:', err);
          setClinicFromApi(null);
        })
        .finally(() => {
          setFetchingClinic(false);
        });
    }
  }, [isClient, clinicId, clinics, fetchingClinic, clinicFromApi]);
  
  // Also refresh clinics list if not loaded yet (attempt once to avoid loops when result is legitimately empty)
  React.useEffect(() => {
    if (!isClient || isLoading) return;
    if (clinics.length === 0 && !clinicsLoadTriedRef.current) {
      clinicsLoadTriedRef.current = true;
      console.log('🔄 Clinics list empty, refreshing once...');
      getClinics().catch(err => console.error('Failed to fetch clinics:', err));
    }
  }, [isClient, isLoading, clinics.length, getClinics]);

  const statistics: ClinicStatistics = useMemo(() => {
    if (!clinic) return {
      totalVisits: 0,
      totalOrders: 0,
      totalSpent: 0,
      totalDebt: 0,
      lastVisitDate: null,
      lastOrderDate: null,
      visitTrend: 'neutral',
      orderTrend: 'neutral',
      registeredBy: null
    };

    // Calculate visits
    const clinicVisits = visits.filter(v => v.clinicId === clinicId);
    const totalVisits = clinicVisits.length;
    const lastVisitDate = clinicVisits.length > 0 
      ? [...clinicVisits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0].visitDate
      : null;

    // Calculate orders
    const clinicOrders = orders.filter(o => o.clinicId === clinicId);
    const totalOrders = clinicOrders.length;
    const totalSpent = clinicOrders.reduce((sum, order) => sum + (order.totalAmount ?? order.total ?? 0), 0);
    const lastOrderDate = clinicOrders.length > 0
      ? [...clinicOrders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
      : null;

    // Calculate debt (assuming collections are payments reducing debt)
    const clinicCollections = collections.filter(c => c.clinicId === clinicId);
    const totalCollected = clinicCollections.reduce((sum, collection) => sum + collection.amount, 0);
    const totalDebt = Math.max(0, totalSpent - totalCollected);

    // Calculate trends (simplified - comparing last 30 days to previous 30 days)
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentVisits = clinicVisits.filter(v => new Date(v.visitDate) >= last30Days).length;
    const previousVisits = clinicVisits.filter(v => {
      const date = new Date(v.visitDate);
      return date >= previous30Days && date < last30Days;
    }).length;

    const recentOrders = clinicOrders.filter(o => new Date(o.orderDate) >= last30Days).length;
    const previousOrders = clinicOrders.filter(o => {
      const date = new Date(o.orderDate);
      return date >= previous30Days && date < last30Days;
    }).length;

    const visitTrend = recentVisits > previousVisits ? 'up' : 
                      recentVisits < previousVisits ? 'down' : 'neutral';
    const orderTrend = recentOrders > previousOrders ? 'up' : 
                      recentOrders < previousOrders ? 'down' : 'neutral';

    // Find who registered this clinic (from activity log or assume first user for now)
    const registeredBy = users.length > 0 ? {
      id: users[0].id,
      name: users[0].fullName,
      role: users[0].role,
      registrationDate: clinic.registeredAt,
      location: {
        lat: 30.0444, // Ideally from activity log
        lng: 31.2357,
        address: "Cairo, Egypt"
      }
    } : null;

    return {
      totalVisits,
      totalOrders,
      totalSpent,
      totalDebt,
      lastVisitDate,
      lastOrderDate,
      visitTrend,
      orderTrend,
      registeredBy
    };
  }, [clinic, visits, orders, collections, users, clinicId]);

  const isAdmin = currentUser?.role === 'admin';

  if (!isClient || isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Clinic Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The clinic you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/clinics')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clinics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const t = i18n.t;
  const siteSettings = useSiteSettingsValue();
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push('/clinics')}
            title="Back to Clinics"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building className="h-8 w-8 text-primary" />
              {clinic.name}
            </h1>
            <p className="text-muted-foreground">{t('clinic_profile.doctor_name')}: {clinic.doctorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={clinic.creditStatus === 'green' ? 'default' : 
                        clinic.creditStatus === 'yellow' ? 'secondary' : 'destructive'}>
            {clinic.creditStatus === 'green' ? 'Good Credit' : 
             clinic.creditStatus === 'yellow' ? 'Warning' : 'Blocked'}
          </Badge>
          <Badge variant="outline">
            Class {clinic.classification}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clinic_profile.kpis.total_visits')}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold">{statistics.totalVisits}</p>
                      {statistics.visitTrend === 'up' && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {statistics.visitTrend === 'down' && (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clinic_profile.kpis.total_orders')}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold">{statistics.totalOrders}</p>
                      {statistics.orderTrend === 'up' && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {statistics.orderTrend === 'down' && (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clinic_profile.kpis.total_spent')}</p>
                    <p className="text-2xl font-bold">{statistics.totalSpent.toLocaleString()} ج.م.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <CreditCard className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('clinic_profile.kpis.current_debt')}</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statistics.totalDebt.toLocaleString()} ج.م.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">{t('clinic_profile.overview')}</TabsTrigger>
              <TabsTrigger value="orders">{t('clinic_profile.orders')}</TabsTrigger>
              <TabsTrigger value="receivables">{t('clinic_profile.receivables')}</TabsTrigger>
              <TabsTrigger value="visits">{t('clinic_profile.visits')}</TabsTrigger>
              <TabsTrigger value="location">{t('clinic_profile.location')}</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('clinic_profile.clinic_information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('clinic_profile.doctor_name')}</Label>
                      <p className="font-medium">{clinic.doctorName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('common.classification')}</Label>
                      <p className="font-medium">Class {clinic.classification}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('common.credit_status')}</Label>
                      <Badge variant={clinic.creditStatus === 'green' ? 'default' : 
                                    clinic.creditStatus === 'yellow' ? 'secondary' : 'destructive'}>
                        {clinic.creditStatus === 'green' ? 'Good' : 
                         clinic.creditStatus === 'yellow' ? 'Warning' : 'Blocked'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('clinic_profile.registered')}</Label>
                      <p className="font-medium">{new Date(clinic.registeredAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <Separator />

                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Credit Limit</Label>
                      <p className="font-medium">{clinic.creditLimit ? `${clinic.creditLimit.toLocaleString()} ج.م.` : '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Payment Terms</Label>
                      <p className="font-medium">{clinic.paymentTermsDays ? `${clinic.paymentTermsDays} days` : '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Current Balance</Label>
                      <p className="font-medium">{statistics.totalDebt.toLocaleString()} ج.م.</p>
                    </div>
                  </div>
                  {clinic.creditLimit && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Utilization</span>
                        <span>{Math.min(100, Math.round((statistics.totalDebt / clinic.creditLimit) * 100)).toString()}%</span>
                      </div>
                      <Progress value={Math.min(100, (statistics.totalDebt / clinic.creditLimit) * 100)} />
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">{t('common.address')}</Label>
                    <p className="font-medium">{clinic.address}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('common.area')}</Label>
                      <p className="font-medium">{clinic.area}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('common.line')}</Label>
                      <p className="font-medium">{clinic.line}</p>
                    </div>
                  </div>

                  {(clinic.clinicPhone || clinic.doctorPhone) && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clinic.clinicPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">{t('common.clinic_phone')}</Label>
                              <p className="font-medium">{clinic.clinicPhone}</p>
                            </div>
                          </div>
                        )}
                        {clinic.doctorPhone && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">{t('common.doctor_phone')}</Label>
                              <p className="font-medium">{clinic.doctorPhone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Contacts */}
              <ContactsCard clinicId={clinicId} />
            </TabsContent>

            {/* Orders */}
            <TabsContent value="orders" className="space-y-4">
              <OrdersTab clinicId={clinicId} />
            </TabsContent>

            {/* Receivables */}
            <TabsContent value="receivables" className="space-y-4">
              <ReceivablesTab clinicId={clinicId} />
            </TabsContent>

            {/* Visits */}
            <TabsContent value="visits" className="space-y-4">
              <VisitsTab clinicId={clinicId} />
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('clinic_profile.location')}
                  </CardTitle>
                  <CardDescription>
                    {t('clinic_profile.location_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mapsSettings.googleMapsEnabled && mapsSettings.apiKey ? (
                    <GoogleMap
                      apiKey={mapsSettings.apiKey}
                      initialLat={clinic.lat}
                      initialLng={clinic.lng}
                      height="300px"
                    />
                  ) : (
                    <div className="p-6 border-2 border-dashed rounded-lg text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-semibold mb-2">{t('clinic_profile.map_not_available')}</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {t('clinic_profile.map_not_configured')}
                      </p>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm"><strong>{t('clinic_profile.coordinates')}:</strong></p>
                        <p className="text-sm">Lat: {clinic.lat.toFixed(6)}</p>
                        <p className="text-sm">Lng: {clinic.lng.toFixed(6)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      {t('clinic_profile.admin.registration_info')}
                    </CardTitle>
                    <CardDescription>
                      {t('clinic_profile.admin.admin_only_desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statistics.registeredBy ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">{t('clinic_profile.admin.registered_by')}</Label>
                            <p className="font-medium">{statistics.registeredBy.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">{t('clinic_profile.admin.user_role')}</Label>
                            <Badge variant="outline">{statistics.registeredBy.role}</Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">{t('clinic_profile.admin.registration_date')}</Label>
                            <p className="font-medium">
                              {new Date(statistics.registeredBy.registrationDate).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">{t('clinic_profile.admin.user_id')}</Label>
                            <p className="font-mono text-sm">{statistics.registeredBy.id}</p>
                          </div>
                        </div>
                        
                        {statistics.registeredBy.location && (
                          <>
                            <Separator />
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                                {t('clinic_profile.admin.user_location')}
                              </Label>
                              {mapsSettings.googleMapsEnabled && mapsSettings.apiKey ? (
                                <GoogleMap
                                  apiKey={mapsSettings.apiKey}
                                  initialLat={statistics.registeredBy.location.lat}
                                  initialLng={statistics.registeredBy.location.lng}
                                  height="200px"
                                />
                              ) : (
                                <div className="bg-muted p-3 rounded">
                                  <p className="text-sm">
                                    <strong>User coordinates:</strong> {statistics.registeredBy.location.lat.toFixed(6)}, {statistics.registeredBy.location.lng.toFixed(6)}
                                  </p>
                                  {statistics.registeredBy.location.address && (
                                    <p className="text-sm mt-1">
                                      <strong>Address:</strong> {statistics.registeredBy.location.address}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Registration information not available. This may be an older clinic record.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right Column - Quick Actions & Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('clinic_profile.quick_actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Schedule Visit */}
              <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setVisitDialogOpen(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('clinic_profile.schedule_visit')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('clinic_profile.schedule_visit')}</DialogTitle>
                    <DialogDescription>Schedule a visit and optionally add notes</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input type="date" value={visitDate} onChange={e=>setVisitDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <Input type="time" value={visitTime} onChange={e=>setVisitTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Purpose</Label>
                      <Input placeholder="e.g., follow up" value={visitPurpose} onChange={e=>setVisitPurpose(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={visitNotes} onChange={e=>setVisitNotes(e.target.value)} rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={async()=>{
                        if (!visitDate) return;
                        const dateIso = new Date(`${visitDate}T${visitTime || '09:00'}:00`).toISOString();
                        await addVisit({
                          clinicId: clinic.id,
                          clinicName: clinic.name,
                          visitDate: dateIso,
                          isCompleted: false,
                          representativeId: currentUser?.id || '',
                          purpose: visitPurpose || 'visit',
                          notes: visitNotes || undefined,
                        });
                        setVisitDialogOpen(false);
                        setVisitDate(''); setVisitTime(''); setVisitPurpose('visit'); setVisitNotes('');
                      }}
                      disabled={!visitDate || !currentUser}
                    >Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Order */}
              <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setOrderDialogOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('clinic_profile.create_order')}
                  </Button>
                </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('clinic_profile.create_order')}</DialogTitle>
                    <DialogDescription>Quick order builder</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    {/* تحميل المنتجات والعملاء عند فتح النافذة */}
                    <React.Fragment>
                      {orderDialogOpen && (
                        <OrderDialogDataLoader onLoadedCustomers={(list)=>{/* no-op */}} />
                      )}
                    </React.Fragment>
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Product</Label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} - {p.price?.toLocaleString()} </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input type="number" min={1} value={orderQty} onChange={e=>setOrderQty(Math.max(1, Number(e.target.value||1)))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary"
                        onClick={()=>{
                          const prod = products.find(p => p.id === selectedProductId);
                          if (!prod) return;
                          const price = (prod as any).price ?? 0;
                          setOrderItems(prev => [...prev, { productId: prod.id, productName: prod.name, quantity: orderQty, price }]);
                          setSelectedProductId(''); setOrderQty(1);
                        }}
                        disabled={!selectedProductId}
                      >Add Item</Button>
                      {orderItems.length > 0 && (
                        <Button variant="ghost" onClick={()=>setOrderItems([])}>Clear Items</Button>
                      )}
                    </div>
                    {orderItems.length > 0 && (
                      <div className="border rounded p-2 space-y-1 max-h-48 overflow-auto">
                        {orderItems.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-sm py-1">
                            <div className="flex-1 truncate">
                              <span className="font-medium">{it.productName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                className="w-20 h-8"
                                value={it.quantity}
                                onChange={e=>{
                                  const q = Math.max(1, Number(e.target.value||1));
                                  setOrderItems(prev => prev.map((p,i) => i===idx ? { ...p, quantity: q } : p));
                                }}
                              />
                          <span className="w-24 text-right tabular-nums">{(it.price * it.quantity).toLocaleString('ar-EG')} ج.م.</span>
                              <Button size="icon" variant="ghost" onClick={()=> setOrderItems(prev => prev.filter((_,i)=>i!==idx))} aria-label="Remove">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex items-center justify-between font-semibold">
                          <span>الإجمالي قبل الخصم</span>
                          <span>{orderItems.reduce((s,i)=>s + i.price * i.quantity, 0).toLocaleString('ar-EG')} ج.م.</span>
                        </div>
                        {orderDiscount > 0 && (
                          <div className="flex items-center justify-between text-sm text-red-600">
                            <span>الخصم ({orderDiscount}{orderDiscountType === 'percentage' ? '%' : ' ج.م.'})</span>
                            <span>-{(orderDiscountType === 'percentage' ? 
                              (orderItems.reduce((s,i)=>s + i.price * i.quantity, 0) * orderDiscount / 100) : 
                              orderDiscount).toLocaleString('ar-EG')} ج.م.</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between font-bold text-lg border-t pt-2">
                          <span>الإجمالي النهائي</span>
                          <span>{(
                            orderItems.reduce((s,i)=>s + i.price * i.quantity, 0) - 
                            (orderDiscountType === 'percentage' ? 
                              (orderItems.reduce((s,i)=>s + i.price * i.quantity, 0) * orderDiscount / 100) : 
                              orderDiscount)
                          ).toLocaleString('ar-EG')} ج.م.</span>
                        </div>
                      </div>
                    )}

                    {/* Discount Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border rounded">
                      <div className="md:col-span-3">
                        <Label className="text-xs text-muted-foreground font-semibold">خصم (اختياري)</Label>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Discount Type</Label>
                        <Select value={orderDiscountType} onValueChange={(v: 'fixed' | 'percentage') => setOrderDiscountType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">مبلغ ثابت (ج.م.)</SelectItem>
                            <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Discount Value</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max={orderDiscountType === 'percentage' ? "100" : undefined}
                          step={orderDiscountType === 'percentage' ? "0.1" : "1"}
                          value={orderDiscount} 
                          onChange={e => setOrderDiscount(Math.max(0, Number(e.target.value) || 0))} 
                          placeholder={orderDiscountType === 'percentage' ? "0.0" : "0"}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setOrderDiscount(0)}
                          disabled={orderDiscount === 0}
                        >
                          Clear Discount
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Order Date</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="date" value={orderDateOnly} onChange={e=>setOrderDateOnly(e.target.value)} />
                          <Input type="time" value={orderTimeOnly} onChange={e=>setOrderTimeOnly(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Payment</Label>
                        <Select value={paymentType} onValueChange={(v)=>setPaymentType(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">دفع فوري</SelectItem>
                            <SelectItem value="credit">دين (مديونية)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Due Date</Label>
                        <Input type="date" value={orderDueDate} onChange={e=>setOrderDueDate(e.target.value)} disabled={paymentType !== 'credit'} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">العميل (لأغراض المحاسبة)</Label>
                      <Select value={orderCustomerId} onValueChange={setOrderCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العميل" />
                        </SelectTrigger>
                        <SelectContent>
                          {customersCache.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} - {c.customer_code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">سيُستخدم هذا العميل لإنشاء فاتورة محاسبية مرتبطة بالطلب.</p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={orderStatus} onValueChange={(v)=>setOrderStatus(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="temp_invoice">Temporary Invoice</SelectItem>
                            <SelectItem value="final_invoice">Final Invoice</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={orderNotes} onChange={e=>setOrderNotes(e.target.value)} rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={async()=>{
                        const total = orderItems.reduce((s,i)=>s + i.price * i.quantity, 0);
                        const orderDateIso = orderDateOnly
                          ? new Date(`${orderDateOnly}T${orderTimeOnly || '09:00'}:00`).toISOString()
                          : new Date().toISOString();

                        // تحقق من ترابط الحقول
                        if (paymentType === 'credit' && !orderDueDate) {
                          toast({ title: 'مطلوب', description: 'يرجى تحديد تاريخ الاستحقاق للمديونية', variant: 'destructive' });
                          return;
                        }
                        if (!orderCustomerId) {
                          toast({ title: 'مطلوب', description: 'اختر العميل لربط الطلب بالحسابات', variant: 'destructive' });
                          return;
                        }

                        // إنشاء الطلب (نموذج سريع في صفحة العيادة)
                        await addOrder({
                          clinicId: clinic.id,
                          clinicName: clinic.name,
                          orderDate: orderDateIso,
                          dueDate: orderDueDate ? new Date(`${orderDueDate}T00:00:00`).toISOString() : undefined,
                          items: orderItems,
                          total,
                          representativeId: currentUser?.id || '',
                          totalAmount: total,
                          status: orderStatus,
                          notes: orderNotes || undefined,
                        } as any);

                        // تكامل محاسبي احترافي: إنشاء فاتورة مرتبطة + دفع/مديونية
                        try {
                          const inv = await invoicesService.createInvoice({
                            customer_id: orderCustomerId,
                            invoice_date: orderDateIso.split('T')[0],
                            due_date: (paymentType === 'credit' && orderDueDate) ? orderDueDate : orderDateIso.split('T')[0],
                            invoice_type: 'sales',
                            discount_amount: 0,
                            notes: JSON.stringify({ meta: { clinic_id: clinic.id, clinic_name: clinic.name, representative_id: currentUser?.id } }),
                            items: orderItems.map(it => ({
                              item_code: it.productId,
                              item_name: it.productName,
                              quantity: it.quantity,
                              unit_price: it.price,
                              discount_percentage: 0,
                              tax_percentage: 0,
                            }))
                          } as any);

                          if (paymentType === 'immediate') {
                            await paymentsService.createPayment({
                              customer_id: orderCustomerId,
                              amount: inv.total_amount,
                              payment_method: 'cash',
                              payment_date: orderDateIso.split('T')[0],
                              allocations: [{ invoice_id: inv.id, allocated_amount: inv.total_amount }]
                            });
                          } else {
                            await receivablesService.createReceivable({
                              customer_id: orderCustomerId,
                              invoice_id: inv.id,
                              reference_number: `INV-${inv.invoice_number}`,
                              original_amount: inv.total_amount,
                              due_date: orderDueDate!,
                              notes: 'مديونية ناتجة عن طلب سريع من صفحة العيادة'
                            });
                          }
                        } catch (e:any) {
                          console.error('Accounting integration failed:', e);
                          toast({ title: 'تنبيه', description: 'تم إنشاء الطلب، لكن فشل الربط المحاسبي. يرجى المراجعة.', variant: 'destructive' });
                        }

                        setOrderDialogOpen(false);
                        setOrderItems([]); setOrderNotes(''); setSelectedProductId(''); setOrderQty(1);
                        setOrderStatus('pending'); setOrderDateOnly(''); setOrderTimeOnly(''); setOrderDueDate(''); setPaymentType('immediate'); setOrderCustomerId('');
                        setOrderDiscount(0); setOrderDiscountType('fixed');
                      }}
                      disabled={orderItems.length === 0 || !currentUser}
                    >Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Record Payment */}
              <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setCollectionDialogOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t('clinic_profile.record_payment')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('clinic_profile.record_payment')}</DialogTitle>
                    <DialogDescription>Record a collection/payment for this clinic</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Amount</Label>
                        <Input type="number" min={0} value={collectionAmount} onChange={e=>setCollectionAmount(Number(e.target.value||0))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input type="datetime-local" value={collectionDate} onChange={e=>setCollectionDate(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Apply to Order (optional)</Label>
                      <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select order to apply" />
                        </SelectTrigger>
                        <SelectContent>
                          {orders.filter(o=>o.clinicId===clinic.id).map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.id} • {new Date(o.orderDate).toLocaleDateString()} • {(o.totalAmount ?? o.total ?? 0).toLocaleString()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <Select value={collectionMethod} onValueChange={(v)=>setCollectionMethod(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={collectionNotes} onChange={e=>setCollectionNotes(e.target.value)} rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={async()=>{
                        const dateIso = collectionDate ? new Date(collectionDate).toISOString() : new Date().toISOString();
                        await addCollection({
                          orderId: selectedOrderId || '',
                          clinicName: clinic.name,
                          repName: currentUser?.fullName || '',
                          collectionDate: dateIso,
                          amount: Number(collectionAmount||0),
                          clinicId: clinic.id,
                          representativeId: currentUser?.id || '',
                          paymentMethod: collectionMethod,
                          notes: collectionNotes || undefined,
                        });
                        setCollectionDialogOpen(false);
                        setCollectionAmount(0); setCollectionDate(''); setCollectionMethod('cash'); setCollectionNotes(''); setSelectedOrderId('');
                      }}
                      disabled={!currentUser || !collectionAmount || collectionAmount <= 0}
                    >Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add Old Debt */}
              <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setDebtDialogOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Old Debt
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Old Debt</DialogTitle>
                    <DialogDescription>Record a historical debt balance for this clinic</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Amount</Label>
                        <Input type="number" min={0} value={debtAmount} onChange={e=>setDebtAmount(Number(e.target.value||0))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Due Date</Label>
                        <Input type="date" value={debtDueDate} onChange={e=>setDebtDueDate(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Input value={debtStatus} onChange={e=>setDebtStatus(e.target.value)} placeholder="current/overdue/closed" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={debtNotes} onChange={e=>setDebtNotes(e.target.value)} rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={async()=>{
                        await addDebt({
                          client_name: clinic.name,
                          amount: Number(debtAmount||0),
                          due_date: debtDueDate ? new Date(debtDueDate).toISOString() : undefined,
                          status: debtStatus || 'current',
                          clinic_id: clinic.id,
                          // Extra (not in type but accepted in service):
                          ...(debtNotes ? { notes: debtNotes } : {}),
                        } as any);
                        setDebtDialogOpen(false);
                        setDebtAmount(0); setDebtDueDate(''); setDebtStatus('current'); setDebtNotes('');
                      }}
                      disabled={!debtAmount || debtAmount <= 0}
                    >Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {isAdmin && (
                <Button className="w-full justify-start" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  {t('clinic_profile.view_activity_log')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('clinic_profile.recent_activity')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statistics.lastVisitDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('clinic_profile.last_visit')}:</span>
                  <span className="font-medium">
                    {new Date(statistics.lastVisitDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {statistics.lastOrderDate && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('clinic_profile.last_order')}:</span>
                  <span className="font-medium">
                    {new Date(statistics.lastOrderDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {!statistics.lastVisitDate && !statistics.lastOrderDate && (
                <p className="text-sm text-muted-foreground">{t('clinic_profile.no_recent_activity')}</p>
              )}
            </CardContent>
          </Card>

          {/* Debt Alert */}
          {statistics.totalDebt > 0 && (
            <Alert variant={statistics.totalDebt > 1000 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('clinic_profile.kpis.current_debt')}:</strong><br />
                {statistics.totalDebt.toLocaleString()} ج.م.
                {statistics.totalDebt > 1000 && (
                  <span className="block mt-1 text-sm">
                    High debt amount requires attention
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

// Contacts Card
function ContactsCard({ clinicId }: { clinicId: string }) {
  const t = i18n.t;
  const { clinics, setClinics, isClient } = useDataProvider();
  const clinic = useMemo(() => clinics.find(c => c.id === clinicId), [clinics, clinicId]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  if (!clinic) return null;

  const addContact = async () => {
    const nextContacts = [...(clinic.contacts ?? []), { id: crypto.randomUUID?.() ?? String(Date.now()), name, role, phone, email, preferredTime }];
    await setClinics(prev => prev.map(c => c.id === clinicId ? { ...c, contacts: nextContacts } : c));
    setOpen(false);
    setName(""); setRole(""); setPhone(""); setEmail(""); setPreferredTime("");
  };

  const setPrimary = async (contactId: string) => {
    const nextContacts = (clinic.contacts ?? []).map(c => ({ ...c, isPrimary: c.id === contactId }));
    await setClinics(prev => prev.map(c => c.id === clinicId ? { ...c, contacts: nextContacts } : c));
  };

  const callHref = (p?: string) => p ? `tel:${p}` : undefined;
  const waHref = (p?: string) => p ? `https://wa.me/${(p||'').replace(/\D/g,'')}` : undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('clinic_profile.contacts')}</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">{t('clinic_profile.add_contact')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('clinic_profile.add_contact')}</DialogTitle>
                <DialogDescription>{t('clinic_profile.contacts')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('common.name')}</Label>
                  <Input value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('common.role')}</Label>
                  <Input value={role} onChange={e=>setRole(e.target.value)} placeholder="Doctor / Assistant / Procurement" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('common.primaryPhone')}</Label>
                  <Input value={phone} onChange={e=>setPhone(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('common.email')}</Label>
                  <Input value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('clinic_profile.preferred_time')}</Label>
                  <Input value={preferredTime} onChange={e=>setPreferredTime(e.target.value)} placeholder="Sun-Thu 10:00-13:00" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addContact} disabled={!name || !phone}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {(!clinic.contacts || clinic.contacts.length === 0) ? (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        ) : (
          <div className="space-y-2">
            {clinic.contacts!.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded border p-2">
                <div className="space-y-0.5">
                  <p className="font-medium flex items-center gap-2">
                    {c.name}
                    {c.isPrimary && <Badge className="text-[10px]" variant="secondary">Primary</Badge>}
                    <span className="text-xs text-muted-foreground">{c.role && `• ${c.role}`}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.phone}{c.email ? ` • ${c.email}` : ''}{c.preferredTime ? ` • ${c.preferredTime}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" asChild>
                    <a href={callHref(c.phone)} aria-label="Call"><PhoneCall className="h-4 w-4"/></a>
                  </Button>
                  <Button size="icon" variant="ghost" asChild>
                    <a href={waHref(c.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle className="h-4 w-4"/></a>
                  </Button>
                  <Button size="icon" variant={c.isPrimary ? 'default' : 'outline'} onClick={() => setPrimary(c.id)} aria-label="Set Primary">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// CSV helper
function exportCSV(name: string, rows: Array<Record<string, any>>) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))];
  const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}


// Orders Tab
function OrdersTab({ clinicId }: { clinicId: string }) {
  const t = i18n.t;
  const { orders, users, clinics, isClient } = useDataProvider();
  const [query, setQuery] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const clinicName = useMemo(() => clinics.find(c => c.id === clinicId)?.name || 'Clinic', [clinics, clinicId]);

  const rows = useMemo(() => {
    const filtered = orders.filter(o => o.clinicId === clinicId && (
      o.id.toLowerCase().includes(query.toLowerCase()) ||
      (o.notes ?? '').toLowerCase().includes(query.toLowerCase())
    ));
    return filtered.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, clinicId, query]);

  const repName = (id?: string) => users.find(u => u.id === id)?.fullName || "-";

  if (!isClient) return <Skeleton className="h-48 w-full"/>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{t('clinic_profile.orders')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => printRef.current && openPrintWindowForElement(printRef.current, 'orders')}>Print</Button>
              <Button variant="outline" size="sm" onClick={() => exportCSV(`orders-${clinicId}`, rows.map(o => ({
                id: o.id,
                date: new Date(o.orderDate).toLocaleString(),
                status: o.status,
                representativeId: o.representativeId,
                total: o.totalAmount ?? o.total ?? 0,
              })))}>Export CSV</Button>
              <Button variant="outline" size="sm" onClick={() => exportPDFUtil('orders', { id: clinicId, name: clinicName }, rows.map(o => ({ ID: o.id, Date: new Date(o.orderDate).toLocaleDateString(), Status: o.status, Rep: (users.find(u=>u.id===o.representativeId)?.fullName)||'-', Total: (o.totalAmount ?? o.total ?? 0) })), 'ar')}>تنزيل PDF</Button>
            </div>
            <div className="flex items-center gap-2 w-72">
              <Search className="h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Search orders..." value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <CardDescription>{t('clinic_profile.orders')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={printRef}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders found for this clinic.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Representative</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === 'delivered' ? 'default' : o.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{repName(o.representativeId)}</TableCell>
                  <TableCell className="text-right">{(o.totalAmount ?? o.total ?? 0).toLocaleString()} ج.م.</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>{rows.length} order(s)</TableCaption>
          </Table>
        )}
        </div>
      </CardContent>
    </Card>
  );
}

// Receivables Tab
function ReceivablesTab({ clinicId }: { clinicId: string }) {
  const t = i18n.t;
  const { orders, collections, clinics, isClient } = useDataProvider();
  const [query, setQuery] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const clinicName = useMemo(() => clinics.find(c => c.id === clinicId)?.name || 'Clinic', [clinics, clinicId]);

  type Row = {
    orderId: string;
    date: string;
    dueDate?: string;
    original: number;
    paid: number;
    balance: number;
    status: 'paid' | 'partial' | 'overdue';
    overdueDays?: number;
  };

  const [bucket, setBucket] = useState<'all' | 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90p'>('all');

  const rows: Row[] = useMemo(() => {
    const clinicOrders = orders.filter(o => o.clinicId === clinicId);
    const mapped = clinicOrders.map(o => {
      const pays = collections.filter(c => c.orderId === o.id);
      const paid = pays.reduce((s,p) => s + p.amount, 0);
      const original = o.totalAmount ?? o.total ?? 0;
      const balance = Math.max(0, original - paid);
      let status: Row['status'] = balance === 0 ? 'paid' : 'partial';
      let overdueDays: number | undefined;
      if (o.dueDate && balance > 0) {
        const diff = Math.floor((Date.now() - new Date(o.dueDate).getTime())/(1000*60*60*24));
        if (diff > 0) { status = 'overdue'; overdueDays = diff; }
      }
      return { orderId: o.id, date: o.orderDate, dueDate: o.dueDate, original, paid, balance, status, overdueDays };
    }).filter(r => r.orderId.toLowerCase().includes(query.toLowerCase()));

    const filtered = mapped.filter(r => {
      if (bucket === 'all') return true;
      if (!r.dueDate || r.status === 'paid' || r.balance === 0) return bucket === 'current';
      const overdue = Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime())/(1000*60*60*24)));
      if (overdue <= 0) return bucket === 'current';
      if (overdue <= 30) return bucket === 'd1_30';
      if (overdue <= 60) return bucket === 'd31_60';
      if (overdue <= 90) return bucket === 'd61_90';
      return bucket === 'd90p';
    });

    return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, collections, clinicId, query, bucket]);

  if (!isClient) return <Skeleton className="h-48 w-full"/>;

  const totalOriginal = rows.reduce((s,r)=>s+r.original,0);
  const totalPaid = rows.reduce((s,r)=>s+r.paid,0);
  const totalBalance = rows.reduce((s,r)=>s+r.balance,0);

  // Aging buckets by balance
  const aging = (() => {
    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90p: 0 };
    for (const r of rows) {
      if (!r.dueDate || r.status === 'paid' || r.balance === 0) { buckets.current += r.balance; continue; }
      const overdue = Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime())/(1000*60*60*24)));
      if (overdue <= 0) buckets.current += r.balance;
      else if (overdue <= 30) buckets.d1_30 += r.balance;
      else if (overdue <= 60) buckets.d31_60 += r.balance;
      else if (overdue <= 90) buckets.d61_90 += r.balance;
      else buckets.d90p += r.balance;
    }
    return buckets;
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{t('clinic_profile.receivables')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => printRef.current && openPrintWindowForElement(printRef.current, 'receivables')}>Print</Button>
              <Button variant="outline" size="sm" onClick={() => exportCSV(`receivables-${clinicId}`, rows.map(r => ({
                order: r.orderId,
                date: new Date(r.date).toLocaleDateString(),
                due: r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-',
                original: r.original,
                paid: r.paid,
                balance: r.balance,
                status: r.status,
              })))}>Export CSV</Button>
              <Button variant="outline" size="sm" onClick={() => exportPDFUtil('receivables', { id: clinicId, name: clinicName }, rows.map(r => ({ Order: r.orderId, Date: new Date(r.date).toLocaleDateString(), Due: r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-', Original: r.original, Paid: r.paid, Balance: r.balance, Status: r.status })), 'ar')}>تنزيل PDF</Button>
            </div>
            <div className="flex items-center gap-2 w-72">
              <Search className="h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Search by Order ID..." value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <CardDescription>{t('clinic_profile.receivables')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryStat title="Original" value={`${totalOriginal.toLocaleString()} ج.م.`} color="text-foreground"/>
          <SummaryStat title="Paid" value={`${totalPaid.toLocaleString()} ج.م.`} color="text-green-600"/>
          <SummaryStat title="Balance" value={`${totalBalance.toLocaleString()} ج.م.`} color="text-red-600"/>
        </div>

        {/* AR Aging */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <SummaryStat title="Current" value={`${aging.current.toLocaleString()} ج.م.`} onClick={() => setBucket(bucket === 'current' ? 'all' : 'current')} active={bucket==='current'} />
          <SummaryStat title="1-30" value={`${aging.d1_30.toLocaleString()} ج.م.`} onClick={() => setBucket(bucket === 'd1_30' ? 'all' : 'd1_30')} active={bucket==='d1_30'} />
          <SummaryStat title="31-60" value={`${aging.d31_60.toLocaleString()} ج.م.`} onClick={() => setBucket(bucket === 'd31_60' ? 'all' : 'd31_60')} active={bucket==='d31_60'} />
          <SummaryStat title="61-90" value={`${aging.d61_90.toLocaleString()} ج.م.`} onClick={() => setBucket(bucket === 'd61_90' ? 'all' : 'd61_90')} active={bucket==='d61_90'} />
          <SummaryStat title="> 90" value={`${aging.d90p.toLocaleString()} ج.م.`} color="text-red-600" onClick={() => setBucket(bucket === 'd90p' ? 'all' : 'd90p')} active={bucket==='d90p'} />
        </div>

        <div ref={printRef}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No receivables found for this clinic.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.orderId}>
                  <TableCell className="font-medium">{r.orderId}</TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right">{r.original.toLocaleString()} ج.م.</TableCell>
                  <TableCell className="text-right">{r.paid.toLocaleString()} ج.م.</TableCell>
                  <TableCell className="text-right font-semibold">{r.balance.toLocaleString()} ج.م.</TableCell>
                  <TableCell>
                    {r.status === 'paid' && <Badge variant="default">Paid</Badge>}
                    {r.status === 'partial' && <Badge variant="secondary">Partial</Badge>}
                    {r.status === 'overdue' && (
                      <Badge variant="destructive">Overdue{r.overdueDays ? ` ${r.overdueDays}d` : ''}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>{rows.length} record(s)</TableCaption>
          </Table>
        )}
        </div>
      </CardContent>
    </Card>
  );
}

// Visits Tab
function VisitsTab({ clinicId }: { clinicId: string }) {
  const t = i18n.t;
  const { visits, users, clinics, isClient } = useDataProvider();
  const [query, setQuery] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const clinicName = useMemo(() => clinics.find(c => c.id === clinicId)?.name || 'Clinic', [clinics, clinicId]);

  const rows = useMemo(() => {
    return visits
      .filter(v => v.clinicId === clinicId && (
        (v.notes ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (v.purpose ?? '').toLowerCase().includes(query.toLowerCase())
      ))
      .sort((a,b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [visits, clinicId, query]);

  const repName = (id?: string) => users.find(u => u.id === id)?.fullName || "-";

  if (!isClient) return <Skeleton className="h-48 w-full"/>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{t('clinic_profile.visits')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => printRef.current && openPrintWindowForElement(printRef.current, 'visits')}>Print</Button>
              <Button variant="outline" size="sm" onClick={() => exportCSV(`visits-${clinicId}`, rows.map(v => ({
                date: new Date(v.visitDate).toLocaleString(),
                purpose: v.purpose ?? '',
                representativeId: v.representativeId,
                completed: v.isCompleted,
                notes: v.notes ?? '',
              })))}>Export CSV</Button>
              <Button variant="outline" size="sm" onClick={() => exportPDFUtil('visits', { id: clinicId, name: clinicName }, rows.map(v => ({ Date: new Date(v.visitDate).toLocaleString(), Purpose: v.purpose ?? '', Rep: (users.find(u=>u.id===v.representativeId)?.fullName)||'-', Status: v.isCompleted ? 'done' : 'pending', Notes: v.notes ?? '' })), 'ar')}>تنزيل PDF</Button>
            </div>
            <div className="flex items-center gap-2 w-72">
              <Search className="h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Search in notes/purpose..." value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <CardDescription>{t('clinic_profile.visits')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={printRef}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visits yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Representative</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(v => (
                <TableRow key={v.id}>
                  <TableCell>{new Date(v.visitDate).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{v.purpose ?? '-'}</TableCell>
                  <TableCell>{repName(v.representativeId)}</TableCell>
                  <TableCell>
                    {v.isCompleted ? <Badge variant="default">Completed</Badge> : <Badge variant="secondary">Pending</Badge>}
                  </TableCell>
                  <TableCell className="max-w-[420px] truncate" title={v.notes}>{v.notes ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>{rows.length} visit(s)</TableCaption>
          </Table>
        )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ title, value, color = 'text-foreground', onClick, active = false }: { title: string; value: string; color?: string; onClick?: () => void; active?: boolean }) {
  const className = `p-3 rounded-md border bg-card ${onClick ? 'cursor-pointer hover:border-primary' : ''} ${active ? 'ring-2 ring-primary' : ''}`;
  return (
    <div className={className} onClick={onClick} role={onClick ? 'button' : undefined}>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Label({ className, children, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}
