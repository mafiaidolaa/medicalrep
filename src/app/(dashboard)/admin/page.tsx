import React from 'react'
import Link from 'next/link'

async function getData() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/dashboard/admin`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('Failed to load dashboard data:', e)
    return { success: false, data: null }
  }
}

async function getTrends() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/dashboard/admin/trends`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('Failed to load dashboard trends:', e)
    return { success: false, data: null }
  }
}

async function getTop() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/dashboard/admin/top`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('Failed to load dashboard top lists:', e)
    return { success: false, data: null }
  }
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0)

export default async function AdminDashboardPage() {
  const [result, trends, topRes] = await Promise.all([getData(), getTrends(), getTop()])
  const data = result?.data
  const trendData = trends?.data
  const topData = topRes?.data

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {!result?.success || !data ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load dashboard metrics. Ensure database tables exist and try again.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Link href="/accounts/invoices" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Sales (Last 30 days)</div>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.last30Days)}</div>
            </Link>
            <Link href="/accounts/invoices" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Pending Orders</div>
              <div className="text-2xl font-bold">{data.sales.pendingOrders}</div>
            </Link>
            <Link href="/accounts/payments" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Collections (Last 30 days)</div>
              <div className="text-2xl font-bold">{formatCurrency(data.collections.last30Days)}</div>
            </Link>
            <Link href="/visits" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Visits (Last 30 days)</div>
              <div className="text-2xl font-bold">{data.visits.last30Days}</div>
            </Link>
            <Link href="/accounts/receivables" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Debt Total</div>
              <div className="text-2xl font-bold">{formatCurrency(data.debts.total)}</div>
            </Link>
            <Link href="/accounts/receivables" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Overdue Debts</div>
              <div className="text-2xl font-bold">{formatCurrency(data.debts.overdue)}</div>
            </Link>
            <Link href="/stock" className="rounded-md border p-4 block hover:bg-gray-50 transition">
              <div className="text-sm text-gray-500">Stock Alerts</div>
              <div className="text-2xl font-bold">{data.inventory.stockAlerts.count}</div>
            </Link>
          </div>

          {Array.isArray(data.inventory.stockAlerts.items) && data.inventory.stockAlerts.items.length > 0 && (
            <div className="rounded-md border p-4">
              <div className="font-semibold mb-2">Low Stock Items</div>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {data.inventory.stockAlerts.items.map((item: any) => (
                  <li key={item.id}>
                    {item.name}: {item.stock} / min {item.min_stock}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.debts?.byStatus && (
            <div className="rounded-md border p-4">
              <div className="font-semibold mb-2">Debts by Status</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries<any>(data.debts.byStatus).map(([status, v]) => (
                  <div key={status} className="rounded border p-3">
                    <div className="text-gray-500">{status}</div>
                    <div className="font-semibold">{v.count} items</div>
                    <div>{formatCurrency(v.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trends?.success && trendData?.months && (
            <div className="rounded-md border p-4">
              <div className="font-semibold mb-2">Trends (Last 6 months)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Monthly Sales</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {trendData.months.map((m: any) => (
                      <li key={m.month}>{m.month}: {formatCurrency(m.sales)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Monthly Visits</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {trendData.months.map((m: any) => (
                      <li key={m.month}>{m.month}: {m.visits}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {topRes?.success && topData && (
            <div className="rounded-md border p-4">
              <div className="font-semibold mb-2">Top (Last 90 days)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Top Products</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {topData.topProducts?.map((p: any) => (
                      <li key={p.id}>
                        {p.name}: {p.qty} units — {formatCurrency(p.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Top Clinics</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {topData.topClinics?.map((c: any) => (
                      <li key={c.id}>
                        {c.name}: {c.orders} orders — {formatCurrency(c.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
