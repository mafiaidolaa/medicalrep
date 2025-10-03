"use client";

import React, { useState, Suspense, lazy, memo, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import LucideIcon from '@/components/ui/lucide-icon';
import { useCounts } from '@/hooks/use-counts';

const Settings = (props: any) => <LucideIcon name="settings" {...props} />;
const MapPin = (props: any) => <LucideIcon name="map-pin" {...props} />;
const Route = (props: any) => <LucideIcon name="route" {...props} />;
const Package = (props: any) => <LucideIcon name="package" {...props} />;
const Shield = (props: any) => <LucideIcon name="shield" {...props} />;
const Users = (props: any) => <LucideIcon name="users" {...props} />;
const Cog = (props: any) => <LucideIcon name="cog" {...props} />;
const Palette = (props: any) => <LucideIcon name="palette" {...props} />;
const Printer = (props: any) => <LucideIcon name="printer" {...props} />;
const Map = (props: any) => <LucideIcon name="map" {...props} />;
const ChevronRight = (props: any) => <LucideIcon name="chevron-right" {...props} />;
const Activity = (props: any) => <LucideIcon name="activity" {...props} />;
const Menu = (props: any) => <LucideIcon name="menu" {...props} />;
const X = (props: any) => <LucideIcon name="x" {...props} />;
const Brain = (props: any) => <LucideIcon name="brain" {...props} />;
const HardDrive = (props: any) => <LucideIcon name="hard-drive" {...props} />;
const Loader2 = (props: any) => <LucideIcon name="loader-2" {...props} />;
const DollarSign = (props: any) => <LucideIcon name="dollar-sign" {...props} />;
const Sparkles = (props: any) => <LucideIcon name="sparkles" {...props} />;
// Lazy load heavy components for better performance
const LineManagement = lazy(() => import('@/components/settings/line-management').then(module => ({ default: module.LineManagement })));
const AreaManagement = lazy(() => import('@/components/settings/area-management').then(module => ({ default: module.AreaManagement })));
const ProductManagement = lazy(() => import('@/components/settings/product-management').then(module => ({ default: module.ProductManagement })));
const PermissionsManagement = lazy(() => import('@/components/settings/permissions-management').then(module => ({ default: module.PermissionsManagement })));
const ThemeManagement = lazy(() => import('@/components/settings/theme-management').then(module => ({ default: module.ThemeManagement })));
const SiteCustomization = lazy(() => import('@/components/settings/site-customization').then(module => ({ default: module.SiteCustomization })));
const PrintSettings = lazy(() => import('@/components/settings/print-settings').then(module => ({ default: module.PrintSettings })));
const PrintLayoutSettings = lazy(() => import('@/components/settings/print-layout').then(module => ({ default: module.PrintLayoutSettings })));
const MapsSettings = lazy(() => import('@/components/settings/maps-settings').then(module => ({ default: module.MapsSettings })));
const IntegrationsCenter = lazy(() => import('@/components/settings/integrations-center').then(module => ({ default: module.IntegrationsCenter })));
const ThemeEditor = lazy(() => import('@/components/settings/theme-editor'));
const PreloaderSettings = lazy(() => import('@/components/settings/preloader-settings').then(module => ({ default: module.PreloaderSettings })));
const ThemeShowcase = lazy(() => import('@/components/settings/theme-showcase').then(module => ({ default: module.ThemeShowcase })));
// الأقسام الجديدة للسيطرة الكاملة - lazy loaded
const BrandIdentityCenterEnhanced = lazy(() => import('@/components/settings/brand-identity-center-enhanced'));
const CyberSecurityCenter = lazy(() => import('@/components/settings/cybersecurity-center').then(module => ({ default: module.CyberSecurityCenter })));
const AdvancedBackupCenter = lazy(() => import('@/components/settings/advanced-backup-center').then(module => ({ default: module.AdvancedBackupCenter })));
const SystemControlPanel = lazy(() => import('@/components/settings/system-control-panel').then(module => ({ default: module.SystemControlPanel })));
const AdvancedCRMCenter = lazy(() => import('@/components/settings/advanced-crm-center').then(module => ({ default: module.AdvancedCRMCenter })));
const ExpensesSettings = lazy(() => import('@/components/settings/expenses-settings').then(module => ({ default: module.ExpensesSettings })));

// Loading component for suspense fallback
const ComponentLoader = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  </div>
);

// تعريف التابات والتصنيفات
const settingsCategories = [
  {
    id: 'core',
    title: 'الإعدادات الأساسية',
    description: 'إدارة البيانات الأساسية للنظام',
    icon: Cog,
    color: 'bg-blue-500',
    tabs: [
      {
        id: 'areas',
        title: 'المناطق',
        description: 'إدارة مناطق العمل',
        icon: MapPin,
        component: AreaManagement,
      },
      {
        id: 'lines',
        title: 'الخطوط',
        description: 'إدارة خطوط العمل',
        icon: Route,
        component: LineManagement,
      },
      {
        id: 'products',
        title: 'المنتجات',
        description: 'إدارة قائمة المنتجات',
        icon: Package,
        component: ProductManagement,
      },
      {
        id: 'expenses',
        title: 'النفقات',
        description: 'إدارة فئات النفقات والأسباب',
        icon: DollarSign,
        component: ExpensesSettings,
      },
    ]
  },
  {
    id: 'security',
    title: 'الأمان والصلاحيات',
    description: 'إدارة المستخدمين والأذونات',
    icon: Shield,
    color: 'bg-red-500',
    tabs: [
      {
        id: 'permissions',
        title: 'الصلاحيات',
        description: 'إدارة صلاحيات المستخدمين',
        icon: Shield,
        component: PermissionsManagement,
      },
    ]
  },
  {
    id: 'appearance',
    title: 'المظهر والتخصيص',
    description: 'تخصيص مظهر وثيمات النظام',
    icon: Palette,
    color: 'bg-purple-500',
    tabs: [
      {
        id: 'brand-identity',
        title: 'الهوية البصرية',
        description: 'إدارة الهوية البصرية والعلامة التجارية مع تكامل الطباعة',
        icon: Palette,
        component: BrandIdentityCenterEnhanced,
      },
      {
        id: 'themes',
        title: 'الثيمات',
        description: 'اختر وطبّق الثيم المناسب من 10 ثيمات احترافية',
        icon: Palette,
        component: ThemeManagement,
      },
      {
        id: 'theme-showcase',
        title: 'معرض الثيمات',
        description: 'استعرض جميع الثيمات المتاحة وخصائصها',
        icon: Sparkles,
        component: ThemeShowcase,
      }
    ]
  },
  {
    id: 'integrations',
    title: 'التكاملات والخدمات',
    description: 'إعدادات الخدمات الخارجية والتكاملات',
    icon: Map,
    color: 'bg-green-500',
    tabs: [
      {
        id: 'maps',
        title: 'خرائط جوجل',
        description: 'إعدادات خرائط جوجل والموقع',
        icon: Map,
        component: MapsSettings,
      },
      {
        id: 'integrations-center',
        title: 'مركز التكاملات',
        description: 'إدارة جميع التكاملات والخدمات الخارجية',
        icon: Settings,
        component: IntegrationsCenter,
      },
    ]
  },
  {
    id: 'security-cybersecurity',
    title: 'الأمان السيبراني والحماية',
    description: 'حماية متقدمة وأمان سيبراني مع مراقبة التهديدات',
    icon: Shield,
    color: 'bg-red-600',
    tabs: [
      { id: 'cybersecurity-center', title: 'مركز الأمان السيبراني', description: 'إدارة الأمان والتهديدات السيبرانية', icon: Shield, component: CyberSecurityCenter },
    ]
  },
  {
    id: 'backup-recovery',
    title: 'النسخ الاحتياطي والاسترداد',
    description: 'نظام نسخ احتياطي متقدم مع إدارة الكوارث',
    icon: HardDrive,
    color: 'bg-green-600',
    tabs: [
      { id: 'advanced-backup', title: 'النسخ الاحتياطي المتقدم', description: 'إدارة النسخ الاحتياطي وخطط الاسترداد', icon: HardDrive, component: AdvancedBackupCenter },
    ]
  },
  {
    id: 'system-control',
    title: 'لوحة تحكم النظام',
    description: 'أداء النظام، إدارة الخدمات، الصيانة والتحديثات',
    icon: Cog,
    color: 'bg-slate-600',
    tabs: [
      { id: 'system-dashboard', title: 'لوحة النظام', description: 'مقاييس الأداء وإدارة الخدمات', icon: Cog, component: SystemControlPanel },
    ]
  },
  {
    id: 'advanced-crm',
    title: 'مركز إدارة العملاء CRM المتقدم',
    description: 'نظام شامل لإدارة العملاء مع أتمتة التسويق والمبيعات ومتابعة رحلة العميل',
    icon: Users,
    color: 'bg-gradient-to-br from-green-600 to-blue-600',
    tabs: [
      { 
        id: 'crm-dashboard', 
        title: 'إدارة العملاء CRM', 
        description: 'قاعدة بيانات شاملة للعملاء مع حملات تسويقية وأتمتة ذكية', 
        icon: Users, 
        component: AdvancedCRMCenter 
      },
    ]
  },
  {
    id: 'output',
    title: 'الطباعة والتصدير',
    description: 'إعدادات الطباعة وتخطيطات التقارير',
    icon: Printer,
    color: 'bg-orange-500',
    tabs: [
      {
        id: 'printing',
        title: 'إعدادات الطباعة',
        description: 'تكوين خيارات الطباعة',
        icon: Printer,
        component: PrintSettings,
      },
      {
        id: 'print-layout',
        title: 'تخطيطات الطباعة',
        description: 'إدارة قوالب الطباعة',
        icon: Printer,
        component: PrintLayoutSettings,
      },
    ]
  },
];

const SettingsPage = memo(function SettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState('core');
  const [selectedTab, setSelectedTab] = useState('areas');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // تأجيل تحميل الأيقونات الديناميكية إلى ما بعد أول رسم لتقليل وقت التهيئة
  const [deferIcons, setDeferIcons] = useState(true);
  // تتبع التبويبات التي تم النقر عليها لتحميلها lazy
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['areas']));
  
  React.useEffect(() => {
    const id = setTimeout(() => setDeferIcons(false), 0);
    return () => clearTimeout(id);
  }, []);
  

  // الحصول على التصنيف المحدد حالياً - memoized
  const currentCategory = useMemo(() => 
    settingsCategories.find(cat => cat.id === selectedCategory), 
    [selectedCategory]
  );
  const currentTab = useMemo(() => 
    currentCategory?.tabs.find(tab => tab.id === selectedTab),
    [currentCategory, selectedTab]
  );

  // عند تغيير التصنيف، اختيار أول تاب في التصنيف الجديد - memoized
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = settingsCategories.find(cat => cat.id === categoryId);
    if (category?.tabs.length) {
      const firstTabId = category.tabs[0].id;
      setSelectedTab(firstTabId);
      // تحميل أول تاب في التصنيف الجديد
      setLoadedTabs(prev => new Set(prev).add(firstTabId));
    }
    // إغلاق الشريط الجانبي على الهواتف الذكية
    setSidebarOpen(false);
  }, []);
  
  // معالج تغيير التاب مع lazy loading
  const handleTabChange = useCallback((tabId: string) => {
    setSelectedTab(tabId);
    // تحميل التاب عند النقر عليه للمرة الأولى
    setLoadedTabs(prev => new Set(prev).add(tabId));
  }, []);

  // إحصائيات سريعة - memoized
  const getTabBadgeCount = useCallback((tabId: string) => {
    switch (tabId) {
      case 'themes': return 10;
      case 'theme-editor': return 'NEW';
      case 'theme-showcase': return '✨';
      case 'preloader-settings': return '🎯';
      case 'maps': return 'API';
      case 'printing': return 'PDF';
      case 'print-layout': return '4';
      default: return null;
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Settings className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    إعدادات النظام
                  </h1>
                  <p className="text-muted-foreground mt-1 hidden sm:block">إدارة شاملة لجميع إعدادات وتكوينات النظام</p>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4">
                {/* عدّادات خفيفة بعد التحميل */}
                <StatsCounters deferIcons={deferIcons} />
              </div>
              
              <Link href="/preloader-studio">
                <Button variant="outline" size="sm" className="gap-2">
                  <Loader2 className="h-4 w-4" />
                  Preloader Studio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - Categories */}
        <div className={`w-80 border-r bg-muted/30 overflow-hidden flex flex-col transition-transform duration-300 z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:relative lg:z-auto fixed inset-y-0 left-0`}>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  تصنيفات الإعدادات
                </h2>
                <p className="text-sm text-muted-foreground mt-1">اختر التصنيف المطلوب</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {settingsCategories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full text-right p-4 rounded-xl transition-all duration-200 group ${
                      isSelected 
                        ? 'bg-primary/10 border-2 border-primary/20 shadow-sm' 
                        : 'bg-background hover:bg-muted border-2 border-transparent hover:border-muted-foreground/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-primary text-primary-foreground' : `${category.color} text-white`
                      }`}>
                        {deferIcons ? (
                          <span className="h-5 w-5 inline-block" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm mb-1 ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}>
                          {category.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {category.tabs.length} {category.tabs.length === 1 ? 'قسم' : 'أقسام'}
                          </Badge>
                          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${
                            isSelected ? 'rotate-90 text-primary' : 'text-muted-foreground group-hover:translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Header with Tabs */}
          {currentCategory && (
            <div className="border-b bg-background">
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${currentCategory.color} text-white`}>
                    <currentCategory.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{currentCategory.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="w-full overflow-x-auto">
                  <div className="flex items-center gap-2 pb-2">
                    {currentCategory.tabs.map((tab) => {
                      const TabIcon = tab.icon;
                      const isSelected = selectedTab === tab.id;
                      const badgeCount = getTabBadgeCount(tab.id);
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {deferIcons ? (
                            <span className="h-4 w-4 inline-block" />
                          ) : (
                            <TabIcon className="h-4 w-4" />
                          )}
                          <span>{tab.title}</span>
                          {badgeCount && (
                            <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs px-2 py-0.5">
                              {badgeCount}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {currentTab && (
                <div className="space-y-6">
                  {/* Tab Header */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {deferIcons ? (
                        <span className="h-5 w-5 inline-block" />
                      ) : (
                        <currentTab.icon className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{currentTab.title}</h3>
                      <p className="text-sm text-muted-foreground">{currentTab.description}</p>
                    </div>
                  </div>
                  
                  {/* Tab Content - lazy loaded فقط إذا تم النقر عليه */}
                  {loadedTabs.has(currentTab.id) ? (
                    <Suspense fallback={<ComponentLoader />}>
                      <currentTab.component />
                    </Suspense>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">انقر على التبويب لتحميل المحتوى...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      
    </div>
  );
});

// مكوّن عدّادات خفيف الوزن
function StatsCounters({ deferIcons }: { deferIcons: boolean }) {
  const { counts: state } = useCounts();

  const areas = state.areas;
  const lines = state.lines;
  const users = state.users;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          {deferIcons ? (
            <span className="h-4 w-4 inline-block" />
          ) : (
            <MapPin className="h-4 w-4 text-blue-600" />
          )}
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">المناطق</div>
          <div className="text-xl font-bold">{areas}</div>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex items-center gap-2">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
          {deferIcons ? (
            <span className="h-4 w-4 inline-block" />
          ) : (
            <Route className="h-4 w-4 text-green-600" />
          )}
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">الخطوط</div>
          <div className="text-xl font-bold">{lines}</div>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex items-center gap-2">
        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          {deferIcons ? (
            <span className="h-4 w-4 inline-block" />
          ) : (
            <Users className="h-4 w-4 text-purple-600" />
          )}
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">المستخدمين</div>
          <div className="text-xl font-bold">{users}</div>
        </div>
      </div>
    </>
  );
}

export default SettingsPage;
