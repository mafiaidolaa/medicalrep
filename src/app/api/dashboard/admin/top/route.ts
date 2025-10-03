import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

function safeNum(n: any) { return Number(n) || 0 }

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch (e) { console.warn('Dashboard top query failed:', e); return fallback }
}

export async function GET(_req: NextRequest) {
  const db = createServerSupabaseClient() as any
  const now = new Date()
  const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const fromISO = from.toISOString()

  const [orders, products, clinics] = await Promise.all([
    safe(async () => {
      const { data, error } = await db
        .from('orders')
        .select('items, clinic_id, total_amount, order_date')
        .gte('order_date', fromISO)
        .limit(10000)
      if (error) throw error
      return (data || []) as any[]
    }, [] as any[]),
    safe(async () => {
      const { data, error } = await db
        .from('products')
        .select('id, name')
        .limit(10000)
      if (error) throw error
      return (data || []) as any[]
    }, [] as any[]),
    safe(async () => {
      const { data, error } = await db
        .from('clinics')
        .select('id, name')
        .limit(10000)
      if (error) throw error
      return (data || []) as any[]
    }, [] as any[]),
  ])

  const productName = new Map<string, string>(products.map((p: any) => [p.id, p.name]))
  const clinicName = new Map<string, string>(clinics.map((c: any) => [c.id, c.name]))

  // Aggregate top products from order items
  const productAgg = new Map<string, { id: string, name: string, qty: number, amount: number }>()
  for (const o of orders) {
    const items = Array.isArray(o.items) ? o.items : []
    for (const it of items) {
      const id = it.product_id || it.id
      if (!id) continue
      const qty = safeNum(it.quantity ?? it.qty)
      const price = safeNum(it.price)
      const key = String(id)
      if (!productAgg.has(key)) {
        productAgg.set(key, { id: key, name: productName.get(key) || it.name || 'Unknown', qty: 0, amount: 0 })
      }
      const ref = productAgg.get(key)!
      ref.qty += qty
      ref.amount += qty * price
    }
  }
  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.amount - a.amount || b.qty - a.qty)
    .slice(0, 5)

  // Aggregate top clinics from orders
  const clinicAgg = new Map<string, { id: string, name: string, orders: number, amount: number }>()
  for (const o of orders) {
    const cid = o.clinic_id
    if (!cid) continue
    const key = String(cid)
    if (!clinicAgg.has(key)) {
      clinicAgg.set(key, { id: key, name: clinicName.get(key) || 'Unknown Clinic', orders: 0, amount: 0 })
    }
    const ref = clinicAgg.get(key)!
    ref.orders += 1
    ref.amount += safeNum(o.total_amount)
  }
  const topClinics = Array.from(clinicAgg.values())
    .sort((a, b) => b.amount - a.amount || b.orders - a.orders)
    .slice(0, 5)

  return NextResponse.json({ success: true, data: { from: fromISO, to: now.toISOString(), topProducts, topClinics } })
}
