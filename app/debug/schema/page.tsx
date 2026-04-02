import { query } from '@/lib/db'

interface ColInfo { column_name: string; data_type: string; is_nullable: string; column_default: string | null; pk: boolean }

export default async function SchemaPage() {
  let tables: string[] = []
  let error = ''

  try {
    const rows = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    )
    tables = rows.map((r) => r.table_name)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">Developer Tool</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Database Schema</h1>
      <p className="text-slate-400 text-sm mb-8">
        Live view of all tables in the connected Supabase database.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      <div className="space-y-6">
        {await Promise.all(tables.map(async (table) => {
          const cols = await query<ColInfo>(`
            SELECT
              c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default,
              (kcu.column_name IS NOT NULL) AS pk
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu
              ON kcu.table_name = c.table_name
              AND kcu.column_name = c.column_name
              AND kcu.constraint_name IN (
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = c.table_name AND constraint_type = 'PRIMARY KEY'
              )
            WHERE c.table_schema = 'public' AND c.table_name = ?
            ORDER BY c.ordinal_position
          `, [table])

          const countRow = await query<{ n: string }>(`SELECT COUNT(*) AS n FROM "${table}"`)
          const rowCount = Number(countRow[0]?.n ?? 0)

          return (
            <div key={table} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="mono text-sm font-bold text-slate-800">{table}</span>
                <span className="text-xs text-slate-400 mono">{rowCount.toLocaleString()} rows</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left px-5 py-2 text-slate-400 font-medium">Column</th>
                    <th className="text-left px-5 py-2 text-slate-400 font-medium">Type</th>
                    <th className="text-left px-5 py-2 text-slate-400 font-medium">Nullable</th>
                    <th className="text-left px-5 py-2 text-slate-400 font-medium">Default</th>
                    <th className="text-left px-5 py-2 text-slate-400 font-medium">PK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 mono">
                  {cols.map((col) => (
                    <tr key={col.column_name} className={col.pk ? 'bg-sky-50' : 'hover:bg-slate-50'}>
                      <td className="px-5 py-2 font-semibold text-slate-700">{col.column_name}</td>
                      <td className="px-5 py-2 text-slate-400">{col.data_type}</td>
                      <td className="px-5 py-2 text-slate-400">{col.is_nullable === 'YES' ? 'yes' : '—'}</td>
                      <td className="px-5 py-2 text-slate-300">{col.column_default ?? '—'}</td>
                      <td className="px-5 py-2">{col.pk ? <span className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-xs font-bold">PK</span> : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }))}
      </div>
    </div>
  )
}
