
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FilePlus, Filter, X, MapPin, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import type { Clinic } from '@/lib/types';
import i18n from '@/lib/i18n'; 
import { useDataProvider } from '@/lib/data-provider';
import { getVisibleClinicsForUser, getVisibleAreasForUser, getVisibleLinesForUser } from '@/lib/visibility';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const ClinicCard = ({ clinic, onDelete, isAdmin }: { clinic: Clinic, onDelete: (clinic: Clinic) => void, isAdmin: boolean }) => {
    const t = i18n.t;
    const router = useRouter();
    const { visits, orders, collections } = useDataProvider();
    const { toast } = useToast();

    // Metrics
    const clinicVisits = visits.filter(v => v.clinicId === clinic.id);
    const clinicOrders = orders.filter(o => o.clinicId === clinic.id);
    const clinicCollections = collections.filter(c => c.clinicId === clinic.id);

    const lastVisitDate = clinicVisits.map(v => v.visitDate).sort().at(-1);
    const lastOrderDate = clinicOrders.map(o => o.orderDate).sort().at(-1);
    const lastCollectionDate = clinicCollections.map(c => c.collectionDate).sort().at(-1);

    const totalSales = clinicOrders.reduce((s, o) => s + (o.totalAmount ?? o.total ?? 0), 0);
    const totalCollected = clinicCollections.reduce((s, c) => s + c.amount, 0);
    const currentDebt = Math.max(0, totalSales - totalCollected);

    // Average days late (paid orders only with dueDate)
    let avgDaysLate: string | null = null;
    const paidWithDue = clinicOrders.filter(o => o.status === 'delivered' && o.dueDate);
    if (paidWithDue.length > 0) {
        let totalDaysLate = 0; let count = 0;
        for (const o of paidWithDue) {
            const cols = clinicCollections.filter(c => (c.orderId === o.id));
            if (cols.length > 0) {
                const lastCol = new Date(Math.max(...cols.map(c => new Date(c.collectionDate).getTime())));
                const due = new Date(o.dueDate!);
                const days = Math.ceil((lastCol.getTime() - due.getTime()) / (1000*60*60*24));
                totalDaysLate += Math.max(0, days);
                count++;
            }
        }
        if (count > 0) avgDaysLate = (totalDaysLate / count).toFixed(1);
    }

    // Sales trend last 3 months vs previous 3
    const now = new Date();
    function ym(d: Date) { return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}`; }
    const monthly = new Map<string, number>();
    for (const o of clinicOrders) {
        const d = new Date(o.orderDate);
        const key = ym(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
        monthly.set(key, (monthly.get(key) || 0) + (o.totalAmount ?? o.total ?? 0));
    }
    const months = [...Array(6)].map((_,i)=>{
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-i,1));
        return ym(d);
    });
    const last3 = months.slice(0,3).reduce((s,k)=> s + (monthly.get(k)||0),0);
    const prev3 = months.slice(3,6).reduce((s,k)=> s + (monthly.get(k)||0),0);
    const trendPct = prev3>0 ? Math.round(((last3 - prev3)/prev3)*100) : (last3>0?100:0);
const trendUp = last3 >= prev3;

    // Risk badge logic
    let riskLabel: string | null = null;
    let riskClass = '';
    const avgLateNum = avgDaysLate ? parseFloat(avgDaysLate) : 0;
    if (avgLateNum >= 14 || currentDebt > 200000) {
        riskLabel = 'خطر'; riskClass = 'bg-red-100 text-red-800 border-red-200';
    } else if (avgLateNum >= 7 || currentDebt > 100000) {
        riskLabel = 'تنبيه'; riskClass = 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (currentDebt > 0) {
        riskLabel = 'مراقبة'; riskClass = 'bg-blue-100 text-blue-800 border-blue-200';
    }

    return (
        <Card className="hover:border-primary transition-all">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="cursor-pointer" onClick={() => router.push(`/clinics/${clinic.id}`)}>
                        <div className="flex items-center gap-2">
                            <CardTitle>{clinic.name}</CardTitle>
                            {riskLabel && <Badge className={`border ${riskClass}`}>{riskLabel}</Badge>}
                        </div>
                        <CardDescription>{clinic.doctorName}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                            const url = `${window.location.origin}/clinics/${clinic.id}`;
                            navigator.clipboard?.writeText(url);
                            toast({ title: 'تم النسخ', description: 'تم نسخ رابط العيادة إلى الحافظة.' });
                        }}>نسخ الرابط</Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" aria-label="Delete clinic">
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف العيادة "{clinic.name}"؟ سيتم إخفاؤها (حذف منطقي) ولن تظهر للمستخدمين.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(clinic)} className="bg-destructive text-destructive-foreground">
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{clinic.address}</p>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2 rounded-md border">
                        <div className="text-muted-foreground">المنطقة/الخط</div>
                        <div className="font-medium mt-1">{(clinic.area || t('common.unspecified_area'))} {clinic.line ? `- ${clinic.line}` : ''}</div>
                    </div>
                    <div className="p-2 rounded-md border">
                        <div className="text-muted-foreground">المديونية الحالية</div>
                        <div className="font-medium mt-1">{currentDebt.toLocaleString('ar-EG')}</div>
                    </div>
                    <div className="p-2 rounded-md border">
                        <div className="text-muted-foreground">آخر زيارة / فاتورة</div>
                        <div className="font-medium mt-1">{lastVisitDate ? new Date(lastVisitDate).toLocaleDateString('ar-EG') : '—'} / {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString('ar-EG') : '—'}</div>
                    </div>
                    <div className="p-2 rounded-md border">
                        <div className="text-muted-foreground">آخر تحصيل</div>
                        <div className="font-medium mt-1">{lastCollectionDate ? new Date(lastCollectionDate).toLocaleDateString('ar-EG') : '—'}</div>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex items-center gap-2">
                        {trendUp ? <TrendingUp className="h-4 w-4 text-green-600"/> : <TrendingDown className="h-4 w-4 text-red-600"/>}
                        <span>اتجاه المبيعات (3 أشهر): {trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground"/>
                        <span>متوسط التأخير: {avgDaysLate ?? 'N/A'} يوم</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const ClinicsPageContent = () => {
    const t = i18n.t;
    const { clinics, areas, lines, isClient, deleteClinic, currentUser, users, orders, collections, getClinics } = useDataProvider();

    const [areaFilter, setAreaFilter] = useState('all');
    const [lineFilter, setLineFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('default');

    // Get current user info for area restrictions
    const currentUserData = useMemo(() => {
        if (currentUser?.email) {
            return users.find(u => u.email === currentUser.email);
        }
        return null;
    }, [currentUser, users]);

    // Team-aware clinics visibility
    const availableClinics = useMemo(() => {
        return getVisibleClinicsForUser(currentUserData || currentUser, clinics, users);
    }, [clinics, currentUserData, currentUser, users]);

    // Available areas and lines for filters (based on user permissions)
    const availableAreas = useMemo(() => {
        try {
            const out = getVisibleAreasForUser(currentUserData || currentUser, Array.isArray(areas) ? areas : (areas ? (Object.values(areas as any) as any[]) : []), clinics);
            const arr = Array.isArray(out) ? out : (out ? (Object.values(out as any) as any[]) : []);
            return (arr as any[]).filter(Boolean).map(String);
        } catch { return []; }
    }, [areas, currentUserData, currentUser, clinics]);

    const availableLinesArr = useMemo(() => {
        const baseLines = Array.isArray(lines) ? lines : (lines ? (Object.values(lines as any) as any[]) : []);
        const raw = getVisibleLinesForUser(currentUserData || currentUser, baseLines as string[], clinics);
        const arr = Array.isArray(raw) ? raw : (raw ? (Object.values(raw as any) as any[]) : []);
        return (arr as any[]).filter(Boolean).map(String);
    }, [lines, currentUserData, currentUser, clinics]);

    const safeLines = useMemo(() => (Array.isArray(availableLinesArr) ? availableLinesArr : []), [availableLinesArr]);

const filteredClinics = useMemo(() => {
        const base = availableClinics
            .filter(c => areaFilter === 'all' || c.area === areaFilter)
            .filter(c => lineFilter === 'all' || c.line === lineFilter)
            .filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
            );

        // Precompute metrics for sorting
        const metrics = new Map<string, { sales: number; debt: number; avgLate: number }>();
        for (const c of base) {
            const csalesOrders = orders.filter(o => o.clinicId === c.id);
            const sales = csalesOrders.reduce((s, o) => s + (o.totalAmount ?? o.total ?? 0), 0);
            const ccols = collections.filter(col => col.clinicId === c.id);
            const collected = ccols.reduce((s, col) => s + col.amount, 0);
            const debt = Math.max(0, sales - collected);
            let avgLate = -1;
            const paidWithDue = csalesOrders.filter(o => o.status === 'delivered' && o.dueDate);
            if (paidWithDue.length > 0) {
                let totalDaysLate = 0; let count = 0;
                for (const o of paidWithDue) {
                    const rows = ccols.filter(col => col.orderId === o.id);
                    if (rows.length > 0) {
                        const lastCol = new Date(Math.max(...rows.map(col => new Date(col.collectionDate).getTime())));
                        const due = new Date(o.dueDate!);
                        const days = Math.ceil((lastCol.getTime() - due.getTime()) / (1000*60*60*24));
                        totalDaysLate += Math.max(0, days);
                        count++;
                    }
                }
                if (count > 0) avgLate = totalDaysLate / count;
            }
            metrics.set(c.id, { sales, debt, avgLate });
        }

        const sorted = [...base];
        if (sortBy === 'most_sales') {
            sorted.sort((a,b) => (metrics.get(b.id)!.sales - metrics.get(a.id)!.sales));
        } else if (sortBy === 'most_debt') {
            sorted.sort((a,b) => (metrics.get(b.id)!.debt - metrics.get(a.id)!.debt));
        } else if (sortBy === 'most_late') {
            sorted.sort((a,b) => ((metrics.get(b.id)!.avgLate ?? -1) - (metrics.get(a.id)!.avgLate ?? -1)));
        }
        return sorted;
    }, [availableClinics, areaFilter, lineFilter, searchTerm, sortBy, orders, collections]);

     if (!isClient) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
        )
    }

    return (
        <>
        {/* Area restriction info */}
        {currentUserData && currentUserData.role !== 'admin' && currentUserData.area && (
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-blue-800">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            تعرض هذه الصفحة العيادات في منطقة "{currentUserData.area}" فقط
                            {currentUserData.line && ` - خط "${currentUserData.line}"`}
                        </span>
                    </div>
                </CardContent>
            </Card>
        )}
        
        <Card className="bg-card/70 backdrop-blur-sm">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Filter/>
                            {t('clinics.filters.title')}
                        </CardTitle>
                    </div>
                     <Button variant="ghost" size="sm" onClick={() => {
                         setAreaFilter('all');
                         setLineFilter('all');
                         setSortBy('default');
                         setSearchTerm('');
                     }}>
                         <X className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>
                         {t('clinics.filters.reset')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger><SelectValue placeholder={t('clinics.filters.area')} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('clinics.filters.all_areas')}</SelectItem>
                        {availableAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={lineFilter} onValueChange={setLineFilter}>
                    <SelectTrigger><SelectValue placeholder={t('clinics.filters.line')} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('clinics.filters.all_lines')}</SelectItem>
                        {safeLines.map((line: any) => (
                            <SelectItem key={String(line)} value={String(line)}>
                                {String(line)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input 
                    placeholder="Search clinics by name or doctor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                 <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue placeholder={t('clinics.filters.sort_by')} /></SelectTrigger>
<SelectContent>
                        <SelectItem value="default">{t('clinics.filters.sort_options.default')}</SelectItem>
                        <SelectItem value="most_sales">{t('clinics.filters.sort_options.most_sales')}</SelectItem>
                        <SelectItem value="most_debt">{t('clinics.filters.sort_options.most_debt')}</SelectItem>
                        <SelectItem value="most_late">الأكثر تأخيراً</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
        
        {filteredClinics.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
{filteredClinics.map(clinic => (
    <ClinicCard key={clinic.id} clinic={clinic} isAdmin={(currentUser as any)?.role === 'admin'} onDelete={async (c) => {
        try {
            await deleteClinic(c.id);
            // Refresh list from server to avoid reappearing due to stale caches
            await getClinics();
        } catch (e: any) {
            console.error('Failed to delete clinic:', e);
        }
    }} />
))}
            </div>
        ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <h3 className="mt-2 text-sm font-semibold">{t('clinics.no_clinics_found')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('clinics.no_clinics_found_desc')}</p>
            </div>
        )}
       
        </>
    )
}


export default function ClinicsPage() {
    const t = i18n.t;
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">{t('clinics.title')}</h1>
                <Link href="/clinics/register">
                    <Button>
                        <FilePlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                        {t('clinics.new_clinic_button')}
                    </Button>
                </Link>
            </div>
            <ClinicsPageContent />
        </div>
    );
}
