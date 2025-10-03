"use client";

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Database, 
  ExternalLink, 
  CheckCircle2, 
  Copy 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DatabaseStatus {
  missingTables: string[];
  hasIssues: boolean;
}

export function DatabaseStatusAlert() {
  const [status, setStatus] = useState<DatabaseStatus>({ missingTables: [], hasIssues: false });
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const sqlScript = `-- Quick Database Fix Script for EP-Group-Sys
-- رن هذا السكريبت في Supabase SQL Editor للإصلاح السريع

-- إنشاء جدول system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB DEFAULT '{}',
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(category, setting_key)
);

-- إنشاء جدول debts
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    clinic_id UUID,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'current' CHECK (status IN ('current', 'overdue', 'critical')),
    invoice_number VARCHAR(100),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات الأساسية (مع حذف السياسات الموجودة أولاً)
DROP POLICY IF EXISTS "Allow authenticated users to access system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated users to access debts" ON public.debts;

CREATE POLICY "Allow authenticated users to access system_settings" 
ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to access debts" 
ON public.debts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- إدراج إعدادات أساسية
INSERT INTO public.system_settings (category, setting_key, setting_value, description)
SELECT 'ui', 'default_theme', '{"theme": "light"}', 'Default UI theme'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE category = 'ui' AND setting_key = 'default_theme');

INSERT INTO public.system_settings (category, setting_key, setting_value, description)
SELECT 'maps', 'google_maps_enabled', '{"enabled": false}', 'Enable Google Maps'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE category = 'maps' AND setting_key = 'google_maps_enabled');

-- رسالة إتمام
SELECT 'Database setup completed successfully! تم إنشاء قاعدة البيانات بنجاح' as message;`;

  const checkDatabaseStatus = async () => {
    setIsChecking(true);
    try {
      // Check for common console errors to detect missing tables
      const missingTables: string[] = [];
      
      // Check if we've seen debts table errors in console
      if (typeof window !== 'undefined') {
        const logs = console.error.toString();
        if (logs.includes('debts') || window.localStorage.getItem('missing_debts_table')) {
          missingTables.push('debts');
        }
        if (logs.includes('system_settings') || window.localStorage.getItem('missing_system_settings_table')) {
          missingTables.push('system_settings');
        }
      }

      setStatus({
        missingTables,
        hasIssues: missingTables.length > 0
      });
    } catch (error) {
      console.warn('Error checking database status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      toast({
        title: "تم النسخ!",
        description: "تم نسخ نص SQL إلى الحافظة",
      });
    } catch (error) {
      toast({
        title: "خطأ في النسخ",
        description: "تعذر نسخ النص، حاول النسخ يدوياً",
        variant: "destructive",
      });
    }
  };

  const dismissAlert = () => {
    setStatus({ missingTables: [], hasIssues: false });
    if (typeof window !== 'undefined') {
      localStorage.setItem('database_issues_dismissed', new Date().toISOString());
    }
  };

  useEffect(() => {
    // Check if user already dismissed this alert recently
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('database_issues_dismissed');
      if (dismissed) {
        const dismissedTime = new Date(dismissed);
        const now = new Date();
        const timeDiff = now.getTime() - dismissedTime.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        
        // Show alert again after 24 hours
        if (hoursDiff < 24) {
          return;
        }
      }
    }

    checkDatabaseStatus();
  }, []);

  if (!status.hasIssues) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            تحذير: مشاكل في قاعدة البيانات
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 mt-2">
            <div className="space-y-2">
              <p>
                تم اكتشاف جداول مفقودة في قاعدة البيانات: <strong>{status.missingTables.join(', ')}</strong>
              </p>
              <p className="text-sm">
                هذا قد يسبب أخطاء في التطبيق. يرجى تشغيل السكريبت المطلوب في Supabase لإصلاح هذه المشكلة.
              </p>
              
              <div className="flex items-center gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-amber-800 border-amber-300 hover:bg-amber-100"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-amber-800 border-amber-300 hover:bg-amber-100"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  نسخ سكريبت SQL
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={dismissAlert}
                  className="text-amber-800 border-amber-300 hover:bg-amber-100"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  تم الإصلاح
                </Button>
              </div>
              
              {showDetails && (
                <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900 rounded-md">
                  <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                    خطوات الإصلاح:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    <li>اذهب إلى Supabase Dashboard</li>
                    <li>انتقل إلى SQL Editor</li>
                    <li>انسخ والصق السكريبت أعلاه</li>
                    <li>اضغط على "Run" لتشغيل السكريبت</li>
                    <li>أعد تحميل الصفحة بعد الانتهاء</li>
                  </ol>
                  
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2 text-amber-900 dark:text-amber-100">سكريبت SQL:</p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-h-40 text-gray-800 dark:text-gray-200">
                      {sqlScript}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}