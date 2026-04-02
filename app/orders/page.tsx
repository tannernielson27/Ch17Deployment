import { requireCustomer } from '@/lib/customer'
import { query, queryOne } from '@/lib/db'
import Link from 'next/link'

interface Order { order_id: number; order_datetime: string; order_total: number }

const PAGE_SIZE = 20

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; page?: string }>
}) {
  const customer = await requireCustomer()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  const countRow = await queryOne<{ total: string }>(
    'SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?',
    [customer.customer_id]
  )
  const total = Number(countRow?.total ?? 0)

  const orders = await query<Order>(
    'SELECT order_id, order_datetime::text AS order_datetime, order_total FROM orders WHERE customer_id = ? ORDER BY order_datetime DESC LIMIT ? OFFSET ?',
    [customer.customer_id, PAGE_SIZE, offset]
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-medium">History</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order History</h1>
          <p className="text-slate-400 text-sm mt-1">{customer.full_name}</p>
        </div>
        <Link href="/place-order" className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors mt-6">
          + New Order
        </Link>
      </div>

      {params.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl mb-5 text-sm font-medium">
          Order placed successfully.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
          No orders yet.{' '}
          <Link href="/place-order" className="text-sky-600 hover:underline">Place your first order.</Link>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-xs text-slate-400 font-medium">Order</th>
                  <th className="text-left px-5 py-2.5 text-xs text-slate-400 font-medium">Date</th>
                  <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.order_id}`} className="mono text-xs font-semibold text-sky-600 hover:text-sky-800">
                        #{o.order_id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{o.order_datetime}</td>
                    <td className="px-5 py-3 text-right mono font-semibold text-slate-700">${Number(o.order_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} orders
              </span>
              <div className="flex gap-1">
                {page > 1 && (
                  <Link href={`?page=${page - 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-slate-300 transition-colors">← Prev</Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2)
                  .map((p) => (
                    <Link key={p} href={`?page=${p}`} className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${p === page ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {p}
                    </Link>
                  ))}
                {page < totalPages && (
                  <Link href={`?page=${page + 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-slate-300 transition-colors">Next →</Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
