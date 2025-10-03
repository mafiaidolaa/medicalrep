
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  LayoutDashboard,
  MapPin,
  Map,
  Pill,
  Trash2,
  ShoppingBag,
  Target,
  DollarSign,
  Menu,
  Bell,
  BarChart,
  Users,
  Settings,
  FileText,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { DynamicLogo } from '@/components/ui/dynamic-logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { AppHeader } from './app-header';
import { hasPermission, defaultRolesConfig } from '@/lib/permissions';
import i18n from '@/lib/i18n';
import { useOptimizedDataProvider } from '@/lib/optimized-data-provider';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { useLocationIntegration } from '@/hooks/use-location-integration';

export const AppLayout = memo(function AppLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { currentUser, getUsers, getClinics } = useOptimizedDataProvider();
  const siteSettings = useSiteSettingsValue();
  
  // Performance monitoring
  const { logMetrics } = usePerformanceMonitor('AppLayout');
  
  // Location integration for automatic tracking
  const locationIntegration = useLocationIntegration();
  
  // Preload critical data on mount for faster navigation
  useEffect(() => {
    const preloadData = async () => {
      try {
        // Preload critical data in parallel
        await Promise.allSettled([
          getUsers(),
          getClinics()
        ]);
      } catch (error) {
        // Silently fail - data will be loaded when needed
        console.debug('Preload failed:', error);
      }
    };
    
    preloadData();
  }, [getUsers, getClinics]);
  
  const navItems = useMemo(() => ([
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard, module: 'dashboard' },
    { href: '/clinics', label: t('nav.clinics'), icon: MapPin, module: 'clinics' },
    { href: '/maps', label: 'الخرائط', icon: Map, module: 'maps' },
    { href: '/visits', label: t('nav.visits'), icon: Briefcase, module: 'visits' },
    { href: '/plans', label: t('nav.plans'), icon: Target, module: 'plans' },
    { href: '/orders', label: t('nav.orders'), icon: ShoppingBag, module: 'orders' },
    { href: '/stock', label: t('nav.stock'), icon: Pill, module: 'stock' },
    { href: '/accounting', label: t('nav.accounting'), icon: DollarSign, module: 'accounting' },
    { href: '/expenses', label: 'النفقات', icon: DollarSign, module: 'expenses' },
    { href: '/reports', label: t('nav.reports'), icon: BarChart, module: 'reports' },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell, module: 'notifications' },
    { href: '/users', label: t('nav.users'), icon: Users, module: 'users' },
    { href: '/activity-log', label: t('nav.activity_log'), icon: FileText, module: 'activity-log' },
    // Admin-only Trash menu
    { href: '/trash', label: 'سلة المحذوفات', icon: Trash2, module: 'trash' },
    { href: '/settings', label: t('nav.settings'), icon: Settings, module: 'settings' },
  ]), [t]);

  const pathname = usePathname();
  const systemName = siteSettings.site_title;
  const systemLogo = siteSettings.logo_path;

  const renderLogo = (className: string) => {
    return <Image src={systemLogo} alt={systemName} width={32} height={32} className={className} data-ai-hint="logo" priority fetchPriority="high"/>
  };

  // Make sidebar side reactive to language changes
  const [sidebarSide, setSidebarSide] = useState<'left' | 'right'>(
    typeof window !== 'undefined' && i18n.dir() === 'rtl' ? 'right' : 'left'
  );

  // Update sidebar side when language changes
  useEffect(() => {
    const currentDir = i18n.dir();
    const newSide = currentDir === 'rtl' ? 'right' : 'left';
    console.log('Language changed:', i18n.language, 'Direction:', currentDir, 'Sidebar side:', newSide);
    setSidebarSide(newSide);
  }, [i18n.language]);

  const sidebarContent = useMemo(() => (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
          <DynamicLogo 
            type="main"
            width={32}
            height={32}
            className="shrink-0"
            fallbackSrc={systemLogo}
            alt={systemName}
          />
          <span className="text-lg font-semibold">{systemName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            if (!currentUser) return null;
            // Admin and GM allowed for Trash
            if (item.module === 'trash') {
              const role = String((currentUser as any).role || '').toLowerCase();
              if (!['admin','gm'].includes(role)) return null;
            }
            if (!hasPermission(currentUser.role, item.module, defaultRolesConfig)) {
              return null;
            }
            return (
                <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="justify-start"
                >
                    <Link href={item.href} prefetch>
                    <item.icon className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                    <span>{item.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            );
           })}
        </SidebarMenu>
      </SidebarContent>
    </>
  ), [navItems, currentUser, pathname, systemName]);

  return (
    <SidebarProvider key={`sidebar-${sidebarSide}-${i18n.language}`}>
      {/* Desktop Sidebar */}
      <Sidebar
        side={sidebarSide}
        variant="sidebar"
        collapsible="offcanvas"
      >
        {sidebarContent}
      </Sidebar>
      
      {/* Main Content with proper inset */}
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
      
      {/* Mobile Sheet Navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            size="icon" 
            variant="outline" 
            className={`fixed bottom-4 ${sidebarSide === 'right' ? 'left-4' : 'right-4'} md:hidden z-50 shadow-lg`}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side={sidebarSide} className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation links for the application.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col h-full">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
});
