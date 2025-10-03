"use client";

import { useState, useMemo, useCallback } from 'react';
import * as React from 'react';
import { useDataProvider } from '@/lib/data-provider';
import type { Order, Visit, Collection, Clinic } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Mail, Phone, MapPin, User, Plus, Edit, Trash2, Search, Filter, BarChart2, ShoppingCart, Clock } from 'lucide-react';
import type { User as UserType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddUserDialog } from '@/components/add-user-dialog';
import { EditUserDialog } from '@/components/edit-user-dialog';
import { useToast } from '@/hooks/use-toast';
import { generateUUID } from '@/lib/supabase-services';
import Link from 'next/link';

const UserCard = React.memo(({ user, onEdit, onDelete, orders, visits, collections, clinics, isAdmin }: { user: UserType; onEdit: (user: UserType) => void; onDelete: (user: UserType) => void; orders: Order[]; visits: Visit[]; collections: Collection[]; clinics: Clinic[]; isAdmin: boolean; }) => {
  const { toast } = useToast();
  const uOrders = orders;
  const uVisits = visits;
  const uCollections = collections;
  const ordersCount = uOrders.length;
  const visitsCount = uVisits.length;
  const totalSales = uOrders.reduce((s, o) => s + (o.totalAmount || o.total || 0), 0);
  const totalCollected = uCollections.reduce((s, c) => s + (c.amount || 0), 0);
  const currentDebt = Math.max(0, totalSales - totalCollected);

  // Best clinic (by sales)
  const clinicNameById = new Map<string, string>();
  (clinics || []).forEach(c => clinicNameById.set(c.id, c.name));
  const salesByClinic = new Map<string, number>();
  for (const o of uOrders) {
    const key = o.clinicId || 'unknown';
    salesByClinic.set(key, (salesByClinic.get(key) || 0) + (o.totalAmount || o.total || 0));
  }
  const bestClinic = Array.from(salesByClinic.entries()).map(([id, value]) => ({ id, name: clinicNameById.get(id) || 'غير محدد', value })).sort((a,b)=>b.value-a.value)[0];

  // Best product (by quantity)
  const qtyByProduct = new Map<string, { name: string; qty: number }>();
  for (const o of uOrders) {
    for (const it of (o.items || [])) {
      const key = it.productId || it.productName || 'unknown';
      const name = it.productName || 'غير محدد';
      const prev = qtyByProduct.get(key);
      qtyByProduct.set(key, { name, qty: (prev?.qty || 0) + (it.quantity || 0) });
    }
  }
  const bestProduct = Array.from(qtyByProduct.values()).sort((a,b)=>b.qty-a.qty)[0];

  // Performance badge vs targets
  const salesTarget = user.salesTarget || 0;
  const visitsTarget = user.visitsTarget || 0;
  const salesPct = salesTarget > 0 ? Math.round((totalSales / salesTarget) * 100) : 0;
  const visitsPct = visitsTarget > 0 ? Math.round((visitsCount / visitsTarget) * 100) : 0;
  const perfScore = Math.round((salesPct + visitsPct) / 2);
  let perfLabel: string = 'مقبول';
  let perfClass: string = 'bg-gradient-to-r from-gray-400 to-slate-400 text-white border-0 shadow-md';
  if (perfScore >= 100) { perfLabel = 'ممتاز'; perfClass = 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 shadow-lg shadow-green-200'; }
  else if (perfScore >= 70) { perfLabel = 'جيد'; perfClass = 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-0 shadow-lg shadow-blue-200'; }
  else if (perfScore >= 40) { perfLabel = 'قيد التحسن'; perfClass = 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 shadow-lg shadow-yellow-200'; }
  else if (perfScore < 40 && perfScore > 0) { perfLabel = 'يحتاج تحسين'; perfClass = 'bg-gradient-to-r from-red-400 to-rose-500 text-white border-0 shadow-lg shadow-red-200'; }

  // Last visit/invoice
  const lastVisit = uVisits.map(v => v.visitDate).sort().at(-1);
  const lastInvoice = uOrders.map(o => o.orderDate).sort().at(-1);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg shadow-red-200';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-lg shadow-blue-200';
      case 'medical_rep': return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-lg shadow-green-200';
      case 'accountant': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-yellow-200';
      case 'user': return 'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0 shadow-lg shadow-purple-200';
      case 'test_user': return 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg shadow-orange-200';
      case 'demo': return 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 shadow-lg shadow-pink-200';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0 shadow-lg shadow-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'manager': return 'مدير منطقة';
      case 'medical_rep': return 'مندوب طبي';
      case 'accountant': return 'محاسب';
      case 'user': return 'مستخدم';
      case 'test_user': return 'مستخدم تجريبي';
      case 'demo': return 'عرض توضيحي';
      default: return role;
    }
  };

  return (
    <Card className="group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02] border-0 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 backdrop-blur-sm">
      <CardHeader className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <CardTitle className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            {user.profilePicture ? (
              <div className="relative">
                <img 
                  src={user.profilePicture} 
                  alt={user.fullName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white/50">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">{user.fullName}</span>
              <div className="text-sm text-gray-500 font-medium">@{user.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getRoleBadgeColor(user.role)} px-3 py-1 text-xs font-semibold tracking-wide`}>
              {getRoleDisplayName(user.role)}
            </Badge>
            <Badge className={`${perfClass} px-3 py-1 text-xs font-semibold tracking-wide`}>
              {perfLabel} {perfScore > 0 && `(${perfScore}%)`}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {/* معلومات المستخدم الأساسية */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100/50">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 shadow-sm">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <span className="text-gray-700 font-medium">{user.email}</span>
          </div>
          {user.primaryPhone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm">
                <Phone className="h-4 w-4 text-white" />
              </div>
              <span className="text-gray-700 font-medium">{user.primaryPhone}</span>
            </div>
          )}
          {user.area && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100/50">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 shadow-sm">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <span className="text-gray-700 font-medium">{user.area} - {user.line}</span>
            </div>
          )}
          {(user.salesTarget || user.visitsTarget) && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/50">
              <div className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                الأهداف الشهرية
              </div>
              <div className="grid grid-cols-2 gap-3">
                {user.salesTarget && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60">
                    <BarChart2 className="h-4 w-4 text-indigo-600" />
                    <div>
                      <div className="text-xs text-gray-600">هدف المبيعات</div>
                      <div className="font-semibold text-indigo-700">{user.salesTarget.toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {user.visitsTarget && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <div>
                      <div className="text-xs text-gray-600">هدف الزيارات</div>
                      <div className="font-semibold text-indigo-700">{user.visitsTarget}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* الإحصائيات السريعة */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 group hover:shadow-lg hover:shadow-emerald-200/50 transition-all duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-xs text-emerald-700 font-medium">الزيارات</div>
              </div>
              <div className="font-bold text-lg text-emerald-800 group-hover:scale-105 transition-transform">{visitsCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 group hover:shadow-lg hover:shadow-blue-200/50 transition-all duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500">
                  <ShoppingCart className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-xs text-blue-700 font-medium">الفواتير</div>
              </div>
              <div className="font-bold text-lg text-blue-800 group-hover:scale-105 transition-transform">{ordersCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100/50 group hover:shadow-lg hover:shadow-red-200/50 transition-all duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-500">
                  <BarChart2 className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-xs text-red-700 font-medium">المديونية</div>
              </div>
              <div className="font-bold text-sm text-red-800 group-hover:scale-105 transition-transform">{currentDebt.toLocaleString('ar-EG')}</div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 group hover:shadow-lg hover:shadow-amber-200/50 transition-all duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
                  <Clock className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-xs text-amber-700 font-medium">آخر نشاط</div>
              </div>
              <div className="text-[10px] text-amber-800 space-y-0.5">
                <div className="font-medium">زيارة: {lastVisit ? new Date(lastVisit).toLocaleDateString('ar-EG') : '—'}</div>
                <div className="font-medium">فاتورة: {lastInvoice ? new Date(lastInvoice).toLocaleDateString('ar-EG') : '—'}</div>
              </div>
            </div>
          </div>

          {/* أفضل عيادة ومنتج */}
          <div className="space-y-3 mt-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-100/50">
              <div className="text-sm font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"></div>
                أفضل عيادة (مبيعات)
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60">
                <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-cyan-800">{bestClinic ? bestClinic.name : 'لا يوجد بيانات'}</div>
                  {bestClinic && <div className="text-sm text-cyan-600">{bestClinic.value.toLocaleString('ar-EG')} جنيه</div>}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100/50">
              <div className="text-sm font-semibold text-violet-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"></div>
                أفضل منتج (كمية)
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60">
                <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-violet-800">{bestProduct ? bestProduct.name : 'لا يوجد بيانات'}</div>
                  {bestProduct && <div className="text-sm text-violet-600">{bestProduct.qty} قطعة</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* الإجراءات */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(user)}
              className="group bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 hover:shadow-lg hover:shadow-blue-200/50"
            >
              <Edit className="h-4 w-4 mr-2 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-blue-700 font-medium">تحرير</span>
            </Button>
            <Link href={`/reports/user-profile?userId=${encodeURIComponent(user.id)}`} className="block">
              <Button variant="outline" size="sm" className="w-full group bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 hover:from-emerald-100 hover:to-green-100 hover:border-emerald-300 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-200/50">
                <BarChart2 className="h-4 w-4 mr-2 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-emerald-700 font-medium">ملف تفصيلي</span>
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              className="group bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 hover:from-purple-100 hover:to-violet-100 hover:border-purple-300 transition-all duration-200 hover:shadow-lg hover:shadow-purple-200/50"
              onClick={() => {
                const url = `${window.location.origin}/reports/user-profile?userId=${encodeURIComponent(user.id)}`;
                navigator.clipboard?.writeText(url);
                toast({ title: 'تم النسخ', description: 'تم نسخ رابط الملف التفصيلي إلى الحافظة.' });
              }}
            >
              <span className="text-purple-700 font-medium text-xs">نسخ رابط</span>
            </Button>
          
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="group bg-gradient-to-r from-red-50 to-rose-50 border-red-200 hover:from-red-100 hover:to-rose-100 hover:border-red-300 transition-all duration-200 hover:shadow-lg hover:shadow-red-200/50"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-600 group-hover:scale-110 transition-transform" />
                    <span className="text-red-700 font-medium">حذف</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف المستخدم "{user.fullName}"؟ هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(user)} className="bg-destructive text-destructive-foreground">
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function UsersPage() {
  const { users, isLoading, isClient, deleteUser, setUsers, orders: providerOrders, visits: providerVisits, collections: providerCollections, clinics, currentUser } = useDataProvider();
  const isAdmin = (currentUser as any)?.role === 'admin';
  const { toast } = useToast();
  
  // Precompute grouping maps to avoid per-card O(N*M) filtering
  const ordersByUser = useMemo(() => {
    const m = new Map<string, Order[]>();
    (providerOrders || []).forEach(o => {
      const k = o.representativeId;
      if (!k) return;
      const arr = m.get(k); if (arr) arr.push(o); else m.set(k, [o]);
    });
    return m;
  }, [providerOrders]);
  const visitsByUser = useMemo(() => {
    const m = new Map<string, Visit[]>();
    (providerVisits || []).forEach(v => {
      const k = v.representativeId;
      if (!k) return;
      const arr = m.get(k); if (arr) arr.push(v); else m.set(k, [v]);
    });
    return m;
  }, [providerVisits]);
  const collectionsByUser = useMemo(() => {
    const m = new Map<string, Collection[]>();
    (providerCollections || []).forEach(c => {
      const k = c.representativeId;
      if (!k) return;
      const arr = m.get(k); if (arr) arr.push(c); else m.set(k, [c]);
    });
    return m;
  }, [providerCollections]);
  
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [period, setPeriod] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'ytd' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [rollupBy, setRollupBy] = useState<'none' | 'area' | 'line' | 'manager'>('none');
  const [rollupValue, setRollupValue] = useState<string>('');
  
  // Function to compute range
  const computeRange = useCallback(() => {
    const now = new Date();
    const startEnd: { start?: string; end?: string } = {};
    if (period === 'this_month') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23,59,59,999));
      startEnd.start = start.toISOString(); startEnd.end = end.toISOString();
    } else if (period === 'last_month') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23,59,59,999));
      startEnd.start = start.toISOString(); startEnd.end = end.toISOString();
    } else if (period === 'last_3_months') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-2, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 0, 23,59,59,999));
      startEnd.start = start.toISOString(); startEnd.end = end.toISOString();
    } else if (period === 'ytd') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23,59,59,999));
      startEnd.start = start.toISOString(); startEnd.end = end.toISOString();
    } else if (period === 'custom' && fromDate && toDate) {
      startEnd.start = new Date(fromDate).toISOString();
      startEnd.end = new Date(new Date(toDate).setHours(23,59,59,999)).toISOString();
    }
    return startEnd.start && startEnd.end ? (startEnd as {start:string;end:string}) : undefined;
  }, [period, fromDate, toDate]);

  // Function to check if date is in range
  const inRange = useCallback((dateIso?: string, range?: {start:string;end:string}) => {
    if (!range || !dateIso) return true;
    return dateIso >= range.start && dateIso <= range.end;
  }, []);

  // Per user metrics function
  const perUserMetrics = useCallback((u: UserType) => {
    const range = computeRange();
    const uVisits = (providerVisits || []).filter(v => v.representativeId === u.id && inRange(v.visitDate, range));
    const uOrders = (providerOrders || []).filter(o => o.representativeId === u.id && inRange(o.orderDate, range));
    const uCollections = (providerCollections || []).filter(c => c.representativeId === u.id && inRange(c.collectionDate, range));
    const visits = uVisits.length;
    const invoicesCount = uOrders.length;
    const sales = uOrders.reduce((s,o)=>s+(o.totalAmount||o.total||0),0);
    const collected = uCollections.reduce((s,c)=>s+(c.amount||0),0);
    const currentDebt = Math.max(0, sales - collected);
    return { name: u.fullName, username: u.username, role: u.role, visits, invoicesCount, sales, collected, currentDebt };
  }, [computeRange, inRange, providerVisits, providerOrders, providerCollections]);
  
  // Filter and search users
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.primaryPhone && user.primaryPhone.includes(query)) ||
        (user.area && user.area.toLowerCase().includes(query)) ||
        (user.line && user.line.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [users, roleFilter, searchQuery]);

  // Rollup Top Products (manager/area/line)
  const rollupTop = useMemo(() => {
    if (rollupBy === 'none' || !rollupValue) return { revenue: [], qty: [] } as { revenue: { name: string; value: number }[]; qty: { name: string; value: number }[] };
    const range = computeRange();
    const inGroup = (u: UserType) => (rollupBy==='area'? u.area : rollupBy==='line'? u.line : (u.manager as any)) === rollupValue;
    const groupUserIds = new Set(filteredUsers.filter(inGroup).map(u => u.id));
    const relevantOrders = (providerOrders||[]).filter(o => groupUserIds.has(o.representativeId) && inRange(o.orderDate, range));
    const revenueBy = new Map<string, { name: string; value: number }>();
    const qtyBy = new Map<string, { name: string; value: number }>();
    for (const o of relevantOrders) {
      for (const it of o.items || []) {
        const key = it.productId || it.productName || 'unknown';
        const name = it.productName || 'غير محدد';
        const rev = (it.price || 0) * (it.quantity || 0);
        const r = revenueBy.get(key);
        revenueBy.set(key, { name, value: (r?.value||0) + rev });
        const q = qtyBy.get(key);
        qtyBy.set(key, { name, value: (q?.value||0) + (it.quantity||0) });
      }
    }
    const revenue = Array.from(revenueBy.values()).sort((a,b)=>b.value-a.value).slice(0,5);
    const qty = Array.from(qtyBy.values()).sort((a,b)=>b.value-a.value).slice(0,5);
    return { revenue, qty };
  }, [rollupBy, rollupValue, filteredUsers, providerOrders, computeRange, inRange]);
  
  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setEditUserOpen(true);
  };
  
  const handleDeleteUser = async (user: UserType) => {
    try {
      await deleteUser(user.id);
      toast({
        title: 'تم حذف المستخدم',
        description: `تم حذف ${user.fullName} بنجاح.`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في حذف المستخدم. يرجى المحاولة مرة أخرى.',
      });
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    medicalReps: users.filter(u => u.role === 'medical_rep').length,
    accountants: users.filter(u => u.role === 'accountant').length,
    regularUsers: users.filter(u => u.role === 'user').length,
    testUsers: users.filter(u => u.role === 'test_user').length,
    demoUsers: users.filter(u => u.role === 'demo').length,
    otherUsers: users.filter(u => !['admin', 'manager', 'medical_rep', 'accountant', 'user', 'test_user', 'demo'].includes(u.role)).length,
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'manager': return 'مدير منطقة';
      case 'medical_rep': return 'مندوب طبي';
      case 'accountant': return 'محاسب';
      case 'user': return 'مستخدم';
      case 'test_user': return 'مستخدم تجريبي';
      case 'demo': return 'عرض توضيحي';
      default: return role;
    }
  };

  const handleCreateDefaultAdmin = async () => {
    try {
      const defaultAdmin = {
        id: generateUUID ? generateUUID() : `admin-${Date.now()}`,
        fullName: 'مدير النظام',
        username: 'admin',
        email: 'admin@system.com',
        role: 'admin' as const,
        password: 'admin123',
        hireDate: new Date().toISOString(),
        primaryPhone: '01000000001',
      };

      // Use the setUsers function that was already extracted from the hook
      await setUsers(prev => [...prev, defaultAdmin]);
      
      toast({
        title: 'تم إنشاء المدير الافتراضي',
        description: 'تم إنشاء حساب المدير الافتراضي. اسم المستخدم: admin، كلمة المرور: admin123',
      });
    } catch (error) {
      console.error('Error creating default admin:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في إنشاء المدير الافتراضي.',
      });
    }
  };


  function exportAllCSV() {
    const rows = filteredUsers.map(perUserMetrics);
    if (rows.length === 0) return;
    const headers = ['name','username','role','visits','invoicesCount','sales','collected','currentDebt'];
    const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))];
    const blob = new Blob(["\uFEFF"+lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `all-reps-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  }


  function exportRollupCSV() {
    if (!(rollupBy !== 'none' && rollupValue)) return;
    const headers = ['Product','Revenue','Qty'];
    const lines = [headers.join(','),
      ...Array.from(new Set([...rollupTop.revenue.map(p=>p.name), ...rollupTop.qty.map(p=>p.name)])).map(name => {
        const r = rollupTop.revenue.find(p=>p.name===name)?.value || 0;
        const q = rollupTop.qty.find(p=>p.name===name)?.value || 0;
        return [JSON.stringify(name), r, q].join(',');
      })
    ];
    const blob = new Blob(["\uFEFF"+lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`rollup-top-products-${rollupBy}-${rollupValue}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportRollupPDF() {
    if (!(rollupBy !== 'none' && rollupValue)) return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200'); if (!w) return;
    const style = `
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 8px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;text-align:start}
        th{background:#f8fafc}
      </style>`;
    const rows = Array.from(new Set([...rollupTop.revenue.map(p=>p.name), ...rollupTop.qty.map(p=>p.name)])).map(name=>{
      const r = rollupTop.revenue.find(p=>p.name===name)?.value || 0;
      const q = rollupTop.qty.find(p=>p.name===name)?.value || 0;
      return `<tr><td>${name}</td><td>${r.toLocaleString()}</td><td>${q}</td></tr>`;
    }).join('');
    const html = `
      <html lang="ar" dir="rtl"><head><meta charset="utf-8">${style}<title>Top Products</title></head>
      <body>
        <h1>أفضل المنتجات — ${rollupBy === 'area' ? 'المنطقة' : rollupBy === 'line' ? 'الخط' : 'المدير'}: ${rollupValue}</h1>
        <table><thead><tr><th>المنتج</th><th>القيمة</th><th>الكمية</th></tr></thead><tbody>${rows}</tbody></table>
        <script>window.print();</script>
      </body></html>`;
    w.document.open(); w.document.write(html); w.document.close();
  }

  function exportAllPDF() {
    const rows = filteredUsers.map(perUserMetrics);
    const w = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=1200');
    if (!w) return;
    const style = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: start; }
        th { background: #f8fafc; }
      </style>
    `;
    const html = `
      <html lang="ar" dir="rtl">
        <head><meta charset="utf-8">${style}<title>All Reps Metrics</title></head>
        <body>
          <h1>ملخص مؤشرات المندوبين (${period})</h1>
          <table>
            <thead>
              <tr><th>الاسم</th><th>المعرف</th><th>الدور</th><th>الزيارات</th><th>عدد الفواتير</th><th>المبيعات</th><th>التحصيل</th><th>المديونية</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => `<tr>
                <td>${r.name}</td>
                <td>@${r.username}</td>
                <td>${r.role}</td>
                <td>${r.visits}</td>
                <td>${r.invoicesCount}</td>
                <td>${(r.sales||0).toLocaleString()}</td>
                <td>${(r.collected||0).toLocaleString()}</td>
                <td>${(r.currentDebt||0).toLocaleString()}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المستخدمون</h1>
          <p className="text-muted-foreground">إدارة جميع مستخدمي النظام بجميع الصلاحيات والأدوار</p>
          <div className="mt-2 flex items-center gap-2 text-sm bg-blue-50 px-3 py-2 rounded-md">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">يتم عرض جميع مستخدمي النظام: المدراء، الموظفين، المستخدمين التجريبيين، وغيرهم</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => setAddUserOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              إضافة مستخدم
            </Button>
            <Badge variant="secondary">
              {userStats.total} مستخدم
            </Badge>
            <Button variant="outline" onClick={() => window.location.href = '/areas-lines'}>
              <MapPin className="h-4 w-4 mr-2" />
              إدارة المناطق
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/users/profile'}>
              <User className="h-4 w-4 mr-2" />
              الملف الشخصي
            </Button>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="بحث بالاسم، اسم المستخدم، البريد الإلكتروني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="تصفية حسب الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأدوار</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="manager">مدير منطقة</SelectItem>
                  <SelectItem value="medical_rep">مندوب طبي</SelectItem>
                  <SelectItem value="accountant">محاسب</SelectItem>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="test_user">مستخدم تجريبي</SelectItem>
                  <SelectItem value="demo">عرض توضيحي</SelectItem>
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الوقت</SelectItem>
                  <SelectItem value="this_month">هذا الشهر</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="last_3_months">آخر 3 أشهر</SelectItem>
                  <SelectItem value="ytd">منذ بداية السنة</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" className="border rounded px-2 py-1 text-sm" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
                  <span className="text-muted-foreground text-xs">إلى</span>
                  <input type="date" className="border rounded px-2 py-1 text-sm" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={rollupBy} onValueChange={(v)=>{ setRollupBy(v as any); setRollupValue(''); }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="تجميع حسب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تجميع</SelectItem>
                  <SelectItem value="area">المنطقة</SelectItem>
                  <SelectItem value="line">الخط</SelectItem>
                  <SelectItem value="manager">المدير</SelectItem>
                </SelectContent>
              </Select>
              {rollupBy !== 'none' && (
                <Select value={rollupValue} onValueChange={setRollupValue}>
                  <SelectTrigger className="w-60"><SelectValue placeholder="اختر القيمة" /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(users.map(u => (rollupBy==='area'? u.area : rollupBy==='line'? u.line : (u.manager as any)) ).filter(Boolean) as string[])).map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportAllCSV}>تصدير الكل CSV</Button>
              <Button variant="outline" onClick={exportAllPDF}>تصدير الكل PDF</Button>
            </div>
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-0 shadow-lg hover:shadow-xl transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 group-hover:scale-105 transition-transform">{userStats.total}</div>
              <div className="text-xs text-gray-600 font-medium">الإجمالي</div>
              <div className="w-8 h-1 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-pink-100 border-0 shadow-lg hover:shadow-xl hover:shadow-red-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 group-hover:scale-105 transition-transform">{userStats.admins}</div>
              <div className="text-xs text-red-700 font-medium">مدراء</div>
              <div className="w-8 h-1 bg-gradient-to-r from-red-400 to-pink-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 group-hover:scale-105 transition-transform">{userStats.managers}</div>
              <div className="text-xs text-blue-700 font-medium">مديرون</div>
              <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl hover:shadow-green-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 group-hover:scale-105 transition-transform">{userStats.medicalReps}</div>
              <div className="text-xs text-green-700 font-medium">مندوبين</div>
              <div className="w-8 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-0 shadow-lg hover:shadow-xl hover:shadow-yellow-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 group-hover:scale-105 transition-transform">{userStats.accountants}</div>
              <div className="text-xs text-yellow-700 font-medium">محاسبين</div>
              <div className="w-8 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-0 shadow-lg hover:shadow-xl hover:shadow-purple-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 group-hover:scale-105 transition-transform">{userStats.regularUsers}</div>
              <div className="text-xs text-purple-700 font-medium">مستخدمين</div>
              <div className="w-8 h-1 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-0 shadow-lg hover:shadow-xl hover:shadow-orange-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 group-hover:scale-105 transition-transform">{userStats.testUsers}</div>
              <div className="text-xs text-orange-700 font-medium">تجريبي</div>
              <div className="w-8 h-1 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-0 shadow-lg hover:shadow-xl hover:shadow-pink-200/50 transition-all duration-200 group">
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600 group-hover:scale-105 transition-transform">{userStats.demoUsers}</div>
              <div className="text-xs text-pink-700 font-medium">عرض</div>
              <div className="w-8 h-1 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full mx-auto mt-2"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredUsers.length > 0 ? (
        <>
          {searchQuery || roleFilter !== 'all' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  عرض {filteredUsers.length} من أصل {users.length} مستخدم
                </span>
                {searchQuery && (
                  <span className="text-blue-700">
                    - البحث: "{searchQuery}"
                  </span>
                )}
                {roleFilter !== 'all' && (
                  <span className="text-blue-700">
                    - الدور: {getRoleDisplayName(roleFilter)}
                  </span>
                )}
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredUsers.map(user => (
              <div key={user.id} className="space-y-2">
                <UserCard 
                  user={user} 
                  onEdit={handleEditUser} 
                  onDelete={handleDeleteUser}
                  orders={ordersByUser.get(user.id) || []}
                  visits={visitsByUser.get(user.id) || []}
                  collections={collectionsByUser.get(user.id) || []}
                  clinics={clinics}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>
        </>
      ) : users.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">لا توجد نتائج</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                لم يتم العثور على مستخدمين يطابقون معايير البحث والتصفية.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                  }}
                >
                  مسح التصفية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">لا يوجد مستخدمين</h3>
              <p className="mt-1 text-sm text-muted-foreground">لم يتم إضافة أي مستخدمين بعد. يمكنك البدء بإنشاء حساب المدير الأساسي.</p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button 
                  onClick={handleCreateDefaultAdmin}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <User className="h-4 w-4 mr-2" />
                  إنشاء مدير افتراضي
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setAddUserOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة مستخدم مخصص
                </Button>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-blue-800">💡 المدير الافتراضي:</p>
                <p className="text-blue-700 mt-1">اسم المستخدم: admin | كلمة المرور: admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Rollup Top Products (optional) */}
      {rollupBy !== 'none' && rollupValue && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>أفضل المنتجات - {rollupBy === 'area' ? 'المنطقة' : rollupBy === 'line' ? 'الخط' : 'المدير'}: {rollupValue}</CardTitle>
                <CardDescription>مجمعة للفترة المختارة</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportRollupCSV}>تصدير CSV</Button>
                <Button variant="outline" size="sm" onClick={exportRollupPDF}>تصدير PDF</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل المنتجات (قيمة)</div>
                <ul className="space-y-1">
                  {rollupTop.revenue.length > 0 ? rollupTop.revenue.map((p, i) => (
                    <li key={`gr-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {p.name}</span><span className="font-medium">{p.value.toLocaleString()}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل المنتجات (كمية)</div>
                <ul className="space-y-1">
                  {rollupTop.qty.length > 0 ? rollupTop.qty.map((p, i) => (
                    <li key={`gq-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {p.name}</span><span className="font-medium">{p.value}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Add Button for small screens */}
      <Button 
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
        aria-label="إضافة مستخدم"
        onClick={() => setAddUserOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialogs */}
      <AddUserDialog 
        open={addUserOpen} 
        onOpenChange={setAddUserOpen} 
      />
      
      <EditUserDialog 
        open={editUserOpen} 
        onOpenChange={(open) => {
          setEditUserOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
}
