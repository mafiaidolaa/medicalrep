
"use client";

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Building,
  Briefcase,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  LayoutDashboard,
  Target,
  Bell,
  Settings,
  ListTodo,
  Sparkles,
  Lightbulb,
  FileText,
  BarChart,
  CheckCircle
} from 'lucide-react';
import type {
  User,
  Clinic,
  Visit,
  Order,
  Collection,
  PlanTask,
  Product,
} from '@/lib/types';
import { OptimizedButton } from '@/components/ui/optimized-button';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import i18n from '@/lib/i18n';
import { hasPermission, defaultRolesConfig } from '@/lib/permissions';

const StatCard = memo(({ title, value, change, icon: Icon, iconBgColor }: { title: string, value: string, change: string, icon: React.ElementType, iconBgColor: string }) => (
  <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-white/10">
    <CardContent className="p-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{change}</p>
        </div>
        <div className={`p-3 rounded-full ${iconBgColor}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
));

const QuickAccessCard = memo(({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) => (
  <Link href={href} prefetch={false}>
    <Card className="hover:bg-muted/80 hover:border-primary/50 transition-all cursor-pointer">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
        <div className="bg-primary/10 p-3 rounded-full">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </CardContent>
    </Card>
  </Link>
));

// Server-fetched KPI widget
function DashboardKPIs() {
  const t = i18n.t;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{
    role: string;
    usersCount?: number;
    clinicsCount: number;
    visitsCount: number;
    ordersCount: number;
    revenue?: number;
    debtsCount?: number;
    debtsAmount?: number;
    collectionsCount?: number;
    collectionsAmount?: number;
    newClinicsLast30?: number;
    growthRate?: number;
    visibility: { showUsers: boolean; showRevenue: boolean; showGrowth: boolean };
    cards: string[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error || `HTTP ${res.status}`);
        if (mounted) { setData(json.data); setLoading(false); }
      } catch (e: any) {
        if (mounted) { setErr(e?.message || 'failed'); setLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4"><Skeleton className="h-16"/></Card>
        ))}
      </div>
    );
  }
  if (err || !data) {
    return <div className="rounded-md border p-3 text-sm text-red-600 bg-red-50">{t('common.failed_to_load')} — {err}</div>;
  }

  const dict: Record<string, { title: string; value: string; Icon: any; color: string; visible: boolean; }> = {
    users:   { title: t('dashboard.users'),  value: String(data.usersCount || 0), Icon: Users,       color: 'bg-purple-500', visible: data.visibility.showUsers },
    clinics: { title: t('dashboard.clinics'),value: String(data.clinicsCount || 0), Icon: Building,   color: 'bg-sky-500',    visible: true },
    visits:  { title: t('dashboard.visits'), value: String(data.visitsCount || 0), Icon: Briefcase,  color: 'bg-teal-500',   visible: true },
    orders:  { title: t('dashboard.orders'), value: String(data.ordersCount || 0), Icon: ShoppingCart,color: 'bg-orange-500',visible: true },
    revenue: { title: t('dashboard.revenue'),value: data.revenue != null ? `${(data.revenue||0).toLocaleString('ar')} ${t('common.egp')}` : '—', Icon: DollarSign,color: 'bg-green-500', visible: data.visibility.showRevenue },
    growth:  { title: t('dashboard.growth_rate'), value: data.growthRate != null ? `${data.growthRate.toFixed(1)}%` : '—', Icon: TrendingUp, color: 'bg-pink-500', visible: data.visibility.showGrowth },
    debts:   { title: t('dashboard.debts') || 'المديونيات', value: String(data.debtsCount || 0), Icon: TrendingUp, color: 'bg-rose-500', visible: true },
    debts_amount: { title: (t('dashboard.debts_total') || 'إجمالي المديونيات'), value: `${(data.debtsAmount||0).toLocaleString('ar')} ${t('common.egp')}`, Icon: DollarSign, color: 'bg-rose-600', visible: true },
    collections: { title: t('dashboard.collections') || 'التحصيلات', value: String(data.collectionsCount || 0), Icon: TrendingUp, color: 'bg-emerald-500', visible: true },
    collections_amount: { title: (t('dashboard.collections_total') || 'إجمالي التحصيل'), value: `${(data.collectionsAmount||0).toLocaleString('ar')} ${t('common.egp')}`, Icon: DollarSign, color: 'bg-emerald-600', visible: true },
    new_clinics: { title: t('dashboard.new_clients') || 'عملاء جدد (30 يوم)', value: String(data.newClinicsLast30 || 0), Icon: Building, color: 'bg-indigo-500', visible: true },
  };

  const items = data.cards
    .map(key => ({ key, ...dict[key] }))
    .filter(i => i && i.visible);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map(i => (
        <StatCard key={i.key} title={i.title} value={i.value} change={''} icon={i.Icon} iconBgColor={i.color} />
      ))}
    </div>
  );
}

interface DashboardClientPageProps {
  initialUsers: User[];
  initialClinics: Clinic[];
  initialVisits: Visit[];
  initialOrders: Order[];
  initialCollections: Collection[];
  initialPlanTasks: PlanTask[];
  initialProducts: Product[];
  currentUser: User;
}

export function DashboardClientPage({
  initialUsers: users,
  initialClinics: clinics,
  initialVisits: visits,
  initialOrders: orders,
  initialCollections: collections,
  initialPlanTasks: planTasks,
  initialProducts: products,
  currentUser
}: DashboardClientPageProps) {
  const t = i18n.t;
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { toast } = useToast();
  const [planTasksState, setPlanTasksState] = useState(planTasks);

  const navItems = useMemo(() => [
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard, module: 'dashboard' },
    { href: '/clinics', label: t('nav.clinics'), icon: Building, module: 'clinics' },
    { href: '/visits', label: t('nav.visits'), icon: Briefcase, module: 'visits' },
    { href: '/plans', label: t('nav.plans'), icon: Target, module: 'plans' },
    { href: '/orders', label: t('nav.orders'), icon: ShoppingCart, module: 'orders' },
    { href: '/stock', label: t('nav.stock'), icon: TrendingUp, module: 'stock' },
    { href: '/accounting', label: t('nav.accounting'), icon: DollarSign, module: 'accounting' },
    { href: '/reports', label: t('nav.reports'), icon: BarChart, module: 'reports' },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell, module: 'notifications' },
    { href: '/users', label: t('nav.users'), icon: Users, module: 'users' },
    { href: '/activity-log', label: t('nav.activity_log'), icon: FileText, module: 'activity-log' },
    { href: '/settings', label: t('nav.settings'), icon: Settings, module: 'settings' },
  ], [t]);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleString('ar', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  }, []);

  const totalRevenue = useMemo(() => orders.reduce((acc, order) => acc + order.total, 0), [orders]);
  const totalVisits = useMemo(() => visits.length, [visits]);
  const salesTarget = useMemo(() => currentUser?.salesTarget || 50000, [currentUser]);
  const visitsTarget = useMemo(() => currentUser?.visitsTarget || 50, [currentUser]);
  const salesProgress = useMemo(() => (totalRevenue / salesTarget) * 100, [totalRevenue, salesTarget]);
  const visitsProgress = useMemo(() => (totalVisits / visitsTarget) * 100, [totalVisits, visitsTarget]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysTasks = useMemo(() => 
    planTasksState.filter(task => task.date.startsWith(today) && !task.isCompleted),
    [planTasksState, today]
  );

  const handleCompleteTask = useCallback((taskId: string) => {
    setPlanTasksState(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, isCompleted: true } : task
      )
    );
    toast({ 
      title: t('auth.task_completed'), 
      description: t('auth.task_updated_successfully') 
    });
  }, [toast, t]);

  return (
    <div className="flex flex-col gap-8">
      <Card className="bg-card/80 backdrop-blur-sm shadow-2xl border-primary/20">
        <CardContent className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard.welcome', { username: currentUser?.username || 'admin' })}</h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.description')}</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">{t('dashboard.last_updated')}</p>
            <p className="font-semibold">{lastUpdated}</p>
          </div>
        </CardContent>
      </Card>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> {t('ai.smart_daily_briefing')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-center py-4">{t('ai.ai_disabled_temporarily')}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> {t('ai.smart_opportunities_radar')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">{t('ai.ai_disabled_temporarily')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic, role-based KPIs fetched from server */}
      <DashboardKPIs />
      

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target /> {t('dashboard.monthly_targets')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><div className="flex justify-between items-end mb-1"><span className="text-sm font-medium">{t('dashboard.sales_target')}</span><span className="text-xs text-muted-foreground">{totalRevenue.toLocaleString()}/{salesTarget.toLocaleString()} {t('common.egp')}</span></div><Progress value={salesProgress} /></div>
            <div><div className="flex justify-between items-end mb-1"><span className="text-sm font-medium">{t('dashboard.visits_target')}</span><span className="text-xs text-muted-foreground">{totalVisits}/{visitsTarget} {t('dashboard.visit')}</span></div><Progress value={visitsProgress} /></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><ListTodo /> {t('dashboard.todays_tasks')}</CardTitle></CardHeader>
          <CardContent>{todaysTasks.length > 0 ? (<Table><TableBody>{todaysTasks.slice(0, 3).map(task => (<TableRow key={task.id}><TableCell className="font-medium">{t(`plans.task_types.${task.taskType}`)}</TableCell><TableCell>{task.clinicName}</TableCell><TableCell className="text-muted-foreground">{task.time || t('dashboard.all_day')}</TableCell><TableCell className="text-right"><OptimizedButton variant="ghost" size="sm" onClick={() => handleCompleteTask(task.id)} preventDoubleClick={true} debounceMs={200}><CheckCircle className="h-4 w-4 text-green-500" /></OptimizedButton></TableCell></TableRow>))}</TableBody></Table>) : (<p className="text-muted-foreground text-center py-4">{t('dashboard.no_tasks_today')}</p>)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('dashboard.quick_access')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 md:grid-cols-7 gap-4">{currentUser && navItems.map(item => hasPermission(currentUser.role, item.module, defaultRolesConfig) && (<QuickAccessCard key={item.href} href={item.href} icon={item.icon} label={item.label} />))}</CardContent>
      </Card>
    </div>
  );
}
