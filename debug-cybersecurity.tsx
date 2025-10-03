// مكون اختبار لتشخيص مشكلة عرض الكائنات
'use client';

import React from 'react';
import { useCybersecurityMonitoring } from '@/lib/cybersecurity-monitoring-system';

export function DebugCybersecurity() {
  const data = useCybersecurityMonitoring();
  
  // تحقق من القيم وعرضها بأمان
  console.log('Cybersecurity data structure:', {
    hasConfig: !!data.config,
    hasDashboard: !!data.dashboard,
    threatsCount: data.threats?.length || 0,
    policiesCount: data.policies?.length || 0,
    isLoading: data.isLoading,
    isScanning: data.isScanning
  });
  
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-bold text-red-700">تشخيص مركز الأمان السيبراني</h3>
      <div className="space-y-2 mt-3 text-sm">
        <div>Config: {data.config ? '✅ موجود' : '❌ غير موجود'}</div>
        <div>Dashboard: {data.dashboard ? '✅ موجود' : '❌ غير موجود'}</div>
        <div>Threats: {Array.isArray(data.threats) ? `✅ ${data.threats.length}` : '❌ ليس مصفوفة'}</div>
        <div>Policies: {Array.isArray(data.policies) ? `✅ ${data.policies.length}` : '❌ ليس مصفوفة'}</div>
        <div>Loading: {String(data.isLoading)}</div>
        <div>Scanning: {String(data.isScanning)}</div>
      </div>
    </div>
  );
}