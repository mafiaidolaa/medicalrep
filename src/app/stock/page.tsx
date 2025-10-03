/**
 * 🏭 EP Group System - Stock Management Dashboard
 * لوحة تحكم إدارة المخازن الرئيسية
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import StockDashboardClient from './stock-dashboard-client';

export const metadata: Metadata = {
  title: 'إدارة المخازن | EP Group System',
  description: 'لوحة تحكم إدارة المخازن والمستلزمات الطبية'
};

export default function StockManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<StockDashboardLoading />}>
        <StockDashboardClient />
      </Suspense>
    </div>
  );
}

function StockDashboardLoading() {
  return (
    <div className="p-6">
      <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}