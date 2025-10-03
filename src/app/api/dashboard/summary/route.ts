import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

/*
  Role-based KPI summary (area/line aware):
  - medical_rep:
      cards => clinicsCount(area+line), visitsCount(own), ordersCount(own), debtsCount(area+line)
  - manager/area_manager/line_manager:
      cards => clinicsCount(area+line), ordersCount(team), debtsCount(area+line), collectionsCount(team)
  - accountant:
      cards => revenue(all), ordersCount(all), collectionsAmount(all), debtsAmount(all), clinicsCount(all), visitsCount(all)
  - gm:
      cards => everything for all regions + newClinicsLast30
  - admin:
      cards => everything + usersCount
*/
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const u: any = session?.user || {};
    const role = String(u?.role || '').toLowerCase();
    const area = u?.area || null;
    const line = u?.line || null;
    const userId = u?.id || null;

    const canSeeRevenue = ['admin','accountant','gm'].includes(role);
    const canSeeUsers = ['admin'].includes(role);
    const canSeeGrowth = ['admin','gm'].includes(role);

    const isManager = ['manager','area_manager','line_manager'].includes(role);

    const supabase = createServerSupabaseClient();

    // Helper: team representatives for managers
    let teamRepIds: string[] = [];
    if (isManager && userId) {
      const { data: team } = await (supabase as any)
        .from('users')
        .select('id, manager')
        .eq('manager', userId)
        .limit(5000);
      teamRepIds = (team || []).map((r: any) => r.id);
    }

    // Clinics count
    let clinicsCount = 0;
    {
      let q = (supabase as any).from('clinics').select('*', { count: 'exact', head: true });
      if (!['admin','gm','accountant'].includes(role) && area && line) {
        q = q.eq('area', area).eq('line', line);
      }
      const { count, error } = await q;
      if (error) throw error;
      clinicsCount = count || 0;
    }

    // Visits count
    let visitsCount = 0;
    {
      let q = (supabase as any).from('visits').select('id', { count: 'exact', head: true });
      if (role === 'medical_rep' && userId) {
        q = q.eq('representative_id', userId);
      } else if (isManager && teamRepIds.length > 0) {
        q = q.in('representative_id', teamRepIds);
      }
      const { count, error } = await q;
      if (error) throw error;
      visitsCount = count || 0;
    }

    // Orders count and revenue
    let ordersCount = 0;
    let revenue: number | undefined = undefined;
    {
      // Count
      let qc = (supabase as any).from('orders').select('id', { count: 'exact', head: true });
      if (role === 'medical_rep' && userId) {
        qc = qc.eq('representative_id', userId);
      } else if (isManager && teamRepIds.length > 0) {
        qc = qc.in('representative_id', teamRepIds);
      }
      const { count: oc, error: oce } = await qc;
      if (oce) throw oce;
      ordersCount = oc || 0;

      if (canSeeRevenue) {
        // Sum revenue (total_amount)
        let qs = (supabase as any).from('orders').select('total_amount');
        if (role === 'medical_rep' && userId) qs = qs.eq('representative_id', userId);
        else if (isManager && teamRepIds.length > 0) qs = qs.in('representative_id', teamRepIds);
        const { data: rows, error: ors } = await qs;
        if (ors) throw ors;
        revenue = (rows || []).reduce((s: number, r: any) => s + Number(r.total_amount || r.total || 0), 0);
      }
    }

    // Users count (admin only)
    let usersCount: number | undefined = undefined;
    if (canSeeUsers) {
      const { count, error } = await (supabase as any).from('users').select('id', { count: 'exact', head: true });
      if (error) throw error;
      usersCount = count || 0;
    }

    // Growth rate based on orders (last 30d vs previous 30d) - admin/gm only
    let growthRate: number | undefined = undefined;
    if (canSeeGrowth) {
      const now = new Date();
      const d30 = new Date(now.getTime() - 30*24*60*60*1000);
      const d60 = new Date(now.getTime() - 60*24*60*60*1000);

      let q1 = (supabase as any).from('orders').select('id').gte('order_date', d30.toISOString());
      let q2 = (supabase as any).from('orders').select('id').gte('order_date', d60.toISOString()).lt('order_date', d30.toISOString());
      const r1 = await q1;
      const r2 = await q2;
      const c1 = (r1.data || []).length;
      const c2 = (r2.data || []).length || 0;
      // If both periods have zero orders, growth should be 0% (not 100%)
      if (c1 === 0 && c2 === 0) {
        growthRate = 0;
      } else if (c2 === 0) {
        // Previous period zero but current has data => treat as 100% growth
        growthRate = 100;
      } else {
        growthRate = ((c1 - c2) / c2) * 100;
      }
    }

    // Debts: count and amount
    let debtsCount = 0; let debtsAmount: number | undefined = undefined;
    {
      // clinics filter for area/line if needed
      let clinicIds: string[] | null = null;
      if ((role === 'medical_rep' || isManager) && area && line) {
        const { data: cls } = await (supabase as any)
          .from('clinics')
          .select('id')
          .eq('area', area)
          .eq('line', line)
          .limit(10000);
        clinicIds = (cls || []).map((c: any) => c.id);
      }
      let qd = (supabase as any).from('debts').select('amount, clinic_id');
      if (clinicIds && clinicIds.length > 0) qd = qd.in('clinic_id', clinicIds);
      const { data: drows } = await qd;
      const arr = drows || [];
      debtsCount = arr.length;
      debtsAmount = arr.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    }

    // Collections: count and amount
    let collectionsCount = 0; let collectionsAmount: number | undefined = undefined;
    {
      let qc = (supabase as any).from('collections').select('amount, representative_id');
      if (role === 'medical_rep' && userId) qc = qc.eq('representative_id', userId);
      else if (isManager && teamRepIds.length > 0) qc = qc.in('representative_id', teamRepIds);
      const { data: crows } = await qc;
      const arr = crows || [];
      collectionsCount = arr.length;
      collectionsAmount = arr.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    }

    // New clinics last 30 days (admin/gm)
    let newClinicsLast30: number | undefined = undefined;
    if (['admin','gm'].includes(role)) {
      const d30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();
      const { count } = await (supabase as any)
        .from('clinics')
        .select('*', { count: 'exact', head: true })
        .gte('registered_at', d30);
      newClinicsLast30 = count || 0;
    }

    // Cards recommendation per role
    const cards: string[] = (() => {
      if (role === 'medical_rep') return ['clinics','visits','orders','debts'];
      if (isManager) return ['clinics','orders','debts','collections'];
      if (role === 'accountant') return ['revenue','orders','collections_amount','debts_amount','clinics','visits'];
      if (role === 'gm') return ['clinics','visits','orders','revenue','debts_amount','collections_amount','new_clinics','growth'];
      if (role === 'admin') return ['users','clinics','visits','orders','revenue','debts_amount','collections_amount','new_clinics','growth'];
      return ['clinics','visits','orders'];
    })();

    return NextResponse.json({
      success: true,
      data: {
        role,
        usersCount,
        clinicsCount,
        visitsCount,
        ordersCount,
        revenue,
        debtsCount,
        debtsAmount,
        collectionsCount,
        collectionsAmount,
        newClinicsLast30,
        growthRate,
        visibility: {
          showUsers: canSeeUsers,
          showRevenue: canSeeRevenue,
          showGrowth: canSeeGrowth,
        },
        cards,
      },
    });
  } catch (e: any) {
    console.error('dashboard summary error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 });
  }
}
