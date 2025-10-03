import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Helper to safely run a query and never throw
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn('Dashboard metric query failed, returning fallback:', e)
    return fallback
  }
}

// Sum helper for numeric arrays
const sum = (arr: (number | null | undefined)[]) => arr.reduce<number>((acc, b) => acc + (Number(b) || 0), 0)

export async function GET(_req: NextRequest) {
  const db = createServerSupabaseClient() as any
  const now = new Date()
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sinceISO = since30.toISOString()

  // Sales (orders)
  const salesLast30Days = await safe(async () => {
    const { data, error } = await db
      .from('orders')
      .select('total_amount, order_date')
      .gte('order_date', sinceISO)
      .limit(2000)

    if (error) throw error
    return sum((data || []).map((r: any) => r.total_amount))
  }, 0)

  const pendingOrdersCount = await safe(async () => {
    const { count, error } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) throw error
    return count || 0
  }, 0)

  // Collections (sum of last 30 days)
  const collectionsLast30Days = await safe(async () => {
    const { data, error } = await db
      .from('collections')
      .select('amount, collection_date')
      .gte('collection_date', sinceISO)
      .limit(2000)

    if (error) throw error
    return sum((data || []).map((r: any) => r.amount))
  }, 0)

  // Visits in last 30 days
  const visitsLast30Days = await safe(async () => {
    const { count, error } = await db
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('visit_date', sinceISO)

    if (error) throw error
    return count || 0
  }, 0)

  // Stock alerts: products where stock <= min_stock
  const stockAlerts = await safe(async () => {
    const { data, error } = await db
      .from('products')
      .select('id, stock, min_stock, name')
      .limit(5000)

    if (error) throw error
    const rows = (data || []) as any[]
    const alerts = rows.filter(r => typeof r.stock === 'number' && typeof r.min_stock === 'number' && r.stock <= r.min_stock)
    return {
      count: alerts.length,
      items: alerts.slice(0, 10).map(a => ({ id: a.id, name: a.name, stock: a.stock, min_stock: a.min_stock }))
    }
  }, { count: 0, items: [] as any[] })

  // Debts aging and totals
  const debts = await safe(async () => {
    const { data, error } = await db
      .from('debts')
      .select('amount, due_date, status')
      .limit(5000)
    if (error) throw error
    return (data || []) as any[]
  }, [])

  const today = new Date()
  const totalDebts = sum(debts.map(d => d.amount))
  const overdueDebts = sum(debts.filter(d => d.due_date && new Date(d.due_date) < today).map(d => d.amount))
  const debtsByStatus = debts.reduce((acc: Record<string, { count: number, amount: number }>, d: any) => {
    const k = d.status || 'unknown'
    if (!acc[k]) acc[k] = { count: 0, amount: 0 }
    acc[k].count += 1
    acc[k].amount += Number(d.amount) || 0
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    data: {
      period: { since: sinceISO, now: now.toISOString() },
      sales: {
        last30Days: salesLast30Days,
        pendingOrders: pendingOrdersCount
      },
      collections: {
        last30Days: collectionsLast30Days
      },
      visits: {
        last30Days: visitsLast30Days
      },
      inventory: {
        stockAlerts
      },
      debts: {
        total: totalDebts,
        overdue: overdueDebts,
        byStatus: debtsByStatus
      }
    }
  })
}
