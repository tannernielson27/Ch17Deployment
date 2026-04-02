import { requireCustomer } from '@/lib/customer'
import { queryOne, query } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Order { order_id: number; order_datetime: string; order_total: number; customer_id: number }
interface LineItem { product_name: string; quantity: number; unit_price: number; line_total: number }

export default async function OrderDetailPage({ params }: { params: Promise<{ order_id: string }> }) {
  await requireCustomer()
  const { order_id } = await params

  const order = await queryOne<Order>(
    'SELECT order_id, order_datetime, order_total, customer_id FROM orders WHERE order_id = ?',
    [order_id]
  )
  if (!order) notFound()

  const items = await query<LineItem>(
    `SELECT p.product_name, oi.quantity, oi.unit_price, oi.line_total
     FROM order_items oi JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id = ?`,
    [order_id]
  )

  return (
    <div>
      <div className="mb-6">
        <Link href="/orders" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Order History</Link>
      </div>
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-medium">Order Detail</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight mono">#{order.order_id}</h1>
      <p className="text-slate-400 text-xs mb-8">{order.order_datetime}</p>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-2.5 text-xs text-slate-400 font-medium">Product</th>
              <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Qty</th>
              <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Unit Price</th>
              <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-700 font-medium">{item.product_name}</td>
                <td className="px-5 py-3 text-right mono text-slate-600">{item.quantity}</td>
                <td className="px-5 py-3 text-right mono text-slate-600">${Number(item.unit_price).toFixed(2)}</td>
                <td className="px-5 py-3 text-right mono font-semibold text-slate-800">${Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td colSpan={3} className="px-5 py-3 text-right text-xs text-slate-500 uppercase tracking-wide font-medium">Order Total</td>
              <td className="px-5 py-3 text-right mono font-bold text-slate-900">${Number(order.order_total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
