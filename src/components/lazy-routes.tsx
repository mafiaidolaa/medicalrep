"use client";

import { lazy } from 'react';
import { LazyWrapper } from './lazy-wrapper';

// Lazy load heavy components
export const LazyOrdersPage = lazy(() => 
  import('@/app/(app)/orders/enhanced-orders-page').then(module => ({ 
    default: module.EnhancedOrdersPage 
  }))
);

export const LazyAccountingClientPage = lazy(() => 
  import('@/app/accounting/accounting-client-page').then(module => ({ 
    default: module.AccountingClientPage 
  }))
);

export const LazyPlansPage = lazy(() => 
  import('@/app/(app)/plans/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyUsersPage = lazy(() => 
  import('@/app/(app)/users/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyClinicsPage = lazy(() => 
  import('@/app/(app)/clinics/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyVisitsPage = lazy(() => 
  import('@/app/(app)/visits/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyNotificationsPage = lazy(() => 
  import('@/app/(app)/notifications/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyActivityLogPage = lazy(() => 
  import('@/app/(app)/activity-log/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyStockPage = lazy(() => 
  import('@/app/(app)/stock/page').then(module => ({ 
    default: module.default 
  }))
);

export const LazyReportsPage = lazy(() => 
  import('@/app/(app)/reports/page').then(module => ({ 
    default: module.default 
  }))
);

// Wrapped components with proper loading states
export const OrdersPageWithLoading = (props: any) => (
  <LazyWrapper fallback="card">
    <LazyOrdersPage {...props} />
  </LazyWrapper>
);

export const AccountingPageWithLoading = (props: any) => (
  <LazyWrapper fallback="table">
    <LazyAccountingClientPage {...props} />
  </LazyWrapper>
);

export const PlansPageWithLoading = (props: any) => (
  <LazyWrapper fallback="table">
    <LazyPlansPage {...props} />
  </LazyWrapper>
);

export const UsersPageWithLoading = (props: any) => (
  <LazyWrapper fallback="table">
    <LazyUsersPage {...props} />
  </LazyWrapper>
);

export const ClinicsPageWithLoading = (props: any) => (
  <LazyWrapper fallback="card">
    <LazyClinicsPage {...props} />
  </LazyWrapper>
);

export const VisitsPageWithLoading = (props: any) => (
  <LazyWrapper fallback="table">
    <LazyVisitsPage {...props} />
  </LazyWrapper>
);

export const NotificationsPageWithLoading = (props: any) => (
  <LazyWrapper fallback="table">
    <LazyNotificationsPage {...props} />
  </LazyWrapper>
);

export const ActivityLogPageWithLoading = (props: any) => (
  <LazyWrapper fallback="table">
    <LazyActivityLogPage {...props} />
  </LazyWrapper>
);

export const StockPageWithLoading = (props: any) => (
  <LazyWrapper fallback="card">
    <LazyStockPage {...props} />
  </LazyWrapper>
);

export const ReportsPageWithLoading = (props: any) => (
  <LazyWrapper fallback="dashboard">
    <LazyReportsPage {...props} />
  </LazyWrapper>
);