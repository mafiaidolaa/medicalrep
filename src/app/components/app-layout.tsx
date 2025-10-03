
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  LayoutDashboard,
  MapPin,
  Pill,
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
import { useTranslation } from 'react-i18next';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { AppHeader } from '@/components/app-header';
import { hasPermission, defaultRolesConfig } from '@/lib/permissions';
import i18n from '@/lib/i18n';
import { useDataProvider } from '@/lib/data-provider';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { currentUser } = useDataProvider();
  
  const canManageReasons = !!currentUser && ['accountant','admin','gm'].includes(currentUser.role);
  const canManageApprovals = !!currentUser && ['manager','admin','gm'].includes(currentUser.role);

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard, module: 'dashboard' },
    { href: '/clinics', label: t('nav.clinics'), icon: MapPin, module: 'clinics' },
    { href: '/visits', label: t('nav.visits'), icon: Briefcase, module: 'visits' },
    { href: '/plans', label: t('nav.plans'), icon: Target, module: 'plans' },
    { href: '/orders', label: t('nav.orders'), icon: ShoppingBag, module: 'orders' },
    { href: '/stock', label: t('nav.stock'), icon: Pill, module: 'stock' },
    { href: '/accounting', label: t('nav.accounting'), icon: DollarSign, module: 'accounting' },
    { href: '/expenses', label: 'المصروفات', icon: DollarSign, module: 'accounting' },
    { href: '/reports', label: t('nav.reports'), icon: BarChart, module: 'reports' },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell, module: 'notifications' },
    { href: '/users', label: t('nav.users'), icon: Users, module: 'users' },
    { href: '/activity-log', label: t('nav.activity_log'), icon: FileText, module: 'activity-log' },
    { href: '/settings', label: t('nav.settings'), icon: Settings, module: 'settings' },
  ];

  const pathname = usePathname();
  const systemName = 'EP Group';
  const systemLogo = '/logo.svg';

  const renderLogo = (className: string) => {
    return <Image src={systemLogo} alt={systemName} width={32} height={32} className={className} data-ai-hint="logo"/>;
  };

  const sidebarSide = i18n.dir() === 'rtl' ? 'right' : 'left';

  const sidebarContent = (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
          {renderLogo('w-8 h-8')}
          <span className="text-lg font-semibold">{systemName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            if (!currentUser || !hasPermission(currentUser.role, item.module, defaultRolesConfig)) {
              return null;
            }
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} className="justify-start">
                  <Link href={item.href}>
                    <item.icon className="w-4 h-4 ml-2" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {/* Accounting group */}
          <div className="px-4 pt-4 text-xs text-muted-foreground">الحسابات</div>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/expenses'} className="justify-start pl-4">
              <Link href="/expenses">
                <DollarSign className="w-4 h-4 ml-2" />
                <span>المصروفات</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {canManageApprovals && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/expenses/approvals'} className="justify-start pl-4">
                <Link href="/expenses/approvals">
                  <FileText className="w-4 h-4 ml-2" />
                  <span>اعتمادات المصروفات</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {canManageReasons && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/accounts/expenses'} className="justify-start pl-4">
                  <Link href="/accounts/expenses">
                    <FileText className="w-4 h-4 ml-2" />
                    <span>إدارة المصروفات</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/accounts/expenses/reasons'} className="justify-start pl-4">
                  <Link href="/accounts/expenses/reasons">
                    <Settings className="w-4 h-4 ml-2" />
                    <span>أسباب المصروفات</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          {/* Managers dashboard link (role-protected) */}
          {currentUser && hasPermission(currentUser.role, 'managers', defaultRolesConfig) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/managers'} className="justify-start">
                <Link href="/managers">
                  <BarChart className="w-4 h-4 ml-2" />
                  <span>لوحة المدراء</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
    </>
  );

  return (
    <SidebarProvider>
       <div className="grid grid-cols-1 md:grid-cols-[auto,1fr]">
        <Sidebar
          className={sidebarSide === 'left' ? "border-r hidden md:flex" : "border-l hidden md:flex"}
          side={sidebarSide}
        >
          {sidebarContent}
        </Sidebar>
        <div className="flex flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
       <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="fixed bottom-4 right-4 md:hidden z-50">
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
}
