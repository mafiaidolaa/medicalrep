import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Utility: format to YYYY-MM
function yyyymm(d: Date) {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${y}-${m}`
}

// Safe runner
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn('Dashboard trends query failed:', e)
    return fallback
  }
}

export async function GET(_req: NextRequest) {
  const db = createServerSupabaseClient() as any
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const fromISO = from.toISOString()

  // Base month buckets
  const months: { key: string, sales: number, visits: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: yyyymm(d), sales: 0, visits: 0 })
  }

  const orders = await safe(async () => {
    const { data, error } = await db
      .from('orders')
      .select('total_amount, order_date')
      .gte('order_date', fromISO)
      .limit(5000)
    if (error) throw error
    return (data || []) as any[]
  }, [])

  const visits = await safe(async () => {
    const { data, error } = await db
      .from('visits')
      .select('visit_date')
      .gte('visit_date', fromISO)
      .limit(5000)
    if (error) throw error
    return (data || []) as any[]
  }, [])

  // Aggregate in JS
  const byMonth = new Map(months.map(m => [m.key, { sales: 0, visits: 0 }]))

  for (const o of orders) {
    if (!o.order_date) continue
    const k = yyyymm(new Date(o.order_date))
    const bucket = byMonth.get(k)
    if (bucket) bucket.sales += Number(o.total_amount) || 0
  }

  for (const v of visits) {
    if (!v.visit_date) continue
    const k = yyyymm(new Date(v.visit_date))
    const bucket = byMonth.get(k)
    if (bucket) bucket.visits += 1
  }

  const result = months.map(m => ({ month: m.key, ...(byMonth.get(m.key) || { sales: 0, visits: 0 }) }))

  return NextResponse.json({ success: true, data: { from: fromISO, to: now.toISOString(), months: result } })
}
