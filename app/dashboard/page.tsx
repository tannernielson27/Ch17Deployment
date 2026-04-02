import { requireCustomer } from '@/lib/customer'
import { query, queryOne } from '@/lib/db'
import Link from 'next/link'

interface OrderSummary { order_count: number; total_spend: number }
interface RecentOrder { order_id: number; order_datetime: string; order_total: number }

export default async function DashboardPage() {
  const customer = await requireCustomer()

  const summary = await queryOne<OrderSummary>(
    'SELECT COUNT(*) AS order_count, COALESCE(SUM(order_total), 0) AS total_spend FROM orders WHERE customer_id = ?',
    [customer.customer_id]
  ) ?? { order_count: 0, total_spend: 0 }

  const recentOrders = await query<RecentOrder>(
    'SELECT order_id, order_datetime, order_total FROM orders WHERE customer_id = ? ORDER BY order_datetime DESC LIMIT 5',
    [customer.customer_id]
  )

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">Overview</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{customer.full_name}</h1>
      <p className="text-slate-400 text-sm mono mb-8">{customer.email}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: String(summary.order_count) },
          { label: 'Total Spend', value: `$${Number(summary.total_spend).toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mono">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Recent Orders</span>
          <Link href="/orders" className="text-xs text-sky-600 hover:text-sky-800 transition-colors">View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-slate-400 text-sm px-5 py-4">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-xs text-slate-400 font-medium">Order</th>
                <th className="text-left px-5 py-2.5 text-xs text-slate-400 font-medium">Date</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <tr key={o.order_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/orders/${o.order_id}`} className="mono text-sky-600 hover:text-sky-800 text-xs font-semibold">
                      #{o.order_id}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{o.order_datetime}</td>
                  <td className="px-5 py-3 text-right mono font-semibold text-slate-700 text-sm">${Number(o.order_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-2">
        <Link href="/place-order" className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          Place New Order
        </Link>
        <Link href="/orders" className="bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          All Orders
        </Link>
      </div>
    </div>
  )
}
