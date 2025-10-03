"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, FileText, PieChart, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>Business intelligence and reporting dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">تقرير الملف التفصيلي للمستخدم</CardTitle>
                  <CardDescription>نظرة حديثة ومتكاملة لأداء المستخدم، قابلة للطباعة و PDF</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">المسار: /reports/user-profile</div>
                  <Button asChild variant="outline">
                    <a href="/reports/user-profile">فتح التقرير</a>
                  </Button>
                </CardContent>
              </Card>
              <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-10">
                <BarChart className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">Reports Module</h3>
                <p className="mt-1 text-sm text-muted-foreground">Analytics and reporting features coming soon.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
