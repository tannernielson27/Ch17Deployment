import { query, queryOne } from '@/lib/db'
import Link from 'next/link'

interface PriorityRow {
  order_id: number; order_datetime: string; order_total: number
  customer_name: string; late_delivery_probability: number
  predicted_late_delivery: number; prediction_timestamp: string
}

const PAGE_SIZE = 25

export default async function PriorityQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  let rows: PriorityRow[] = []
  let total = 0
  let dbError = ''

  try {
    const countRow = await queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM orders o JOIN order_predictions p ON p.order_id = o.order_id`
    )
    total = Number(countRow?.total ?? 0)

    rows = await query<PriorityRow>(`
      SELECT o.order_id, o.order_datetime::text AS order_datetime, o.order_total,
        c.full_name AS customer_name,
        p.late_delivery_probability, p.predicted_late_delivery, p.prediction_timestamp::text AS prediction_timestamp
      FROM orders o
      JOIN customers c ON c.customer_id = o.customer_id
      JOIN order_predictions p ON p.order_id = o.order_id
      ORDER BY p.late_delivery_probability DESC, o.order_datetime ASC
      LIMIT ? OFFSET ?
    `, [PAGE_SIZE, offset])
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Unknown error'
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-medium">ML Pipeline</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fraud Risk Priority Queue</h1>
          <p className="text-slate-400 text-sm mt-1">Orders ranked by predicted fraud probability.</p>
        </div>
        <Link href="/scoring" className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors mt-6">
          Run Scoring
        </Link>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
          <span className="font-semibold">Error:</span> {dbError}
          <div className="text-red-400 mt-0.5 text-xs">Run the scoring job to populate <code>order_predictions</code>.</div>
        </div>
      )}

      {!dbError && rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm mb-4">No predictions yet.</p>
          <Link href="/scoring" className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
            Run Scoring →
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Order</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Customer</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs text-slate-400 font-medium">Total</th>
                  <th className="text-right px-4 py-2.5 text-xs text-slate-400 font-medium">Fraud Prob.</th>
                  <th className="text-center px-4 py-2.5 text-xs text-slate-400 font-medium">Predicted</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Scored At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row) => {
                  const prob = Number(row.late_delivery_probability)
                  const isHigh = prob >= 0.7
                  const isMid = prob >= 0.4
                  return (
                    <tr key={row.order_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${row.order_id}`} className="mono text-xs font-semibold text-sky-600 hover:text-sky-800">
                          #{row.order_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-sm">{row.customer_name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{row.order_datetime}</td>
                      <td className="px-4 py-3 text-right mono font-semibold text-slate-700">${Number(row.order_total).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right mono font-bold text-sm ${isHigh ? 'text-red-500' : isMid ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {(prob * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.predicted_late_delivery ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">Fraud</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">Legit</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs mono">{row.prediction_timestamp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()} scored orders</span>
            <div className="flex gap-1">
              {page > 1 && <Link href={`?page=${page - 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-slate-300 transition-colors">← Prev</Link>}
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2).map((p) => (
                <Link key={p} href={`?page=${p}`} className={`px-3 py-1.5 border rounded-lg text-xs transition-colors ${p === page ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{p}</Link>
              ))}
              {page < totalPages && <Link href={`?page=${page + 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-slate-300 transition-colors">Next →</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
