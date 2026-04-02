import Link from 'next/link'

const features = [
  { label: 'Place Orders', desc: 'Create orders for any customer in the database' },
  { label: 'Order History', desc: 'Browse line-item detail for any order' },
  { label: 'ML Scoring', desc: 'Run the inference job with one click' },
  { label: 'Priority Queue', desc: 'Surface at-risk orders ranked by late-delivery probability' },
]

export default function Home() {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">IS 455 — Vibe Code Project</p>
      <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Shop Dashboard</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        A web interface for the ML late-delivery pipeline. Select a customer to get started.
      </p>

      <Link
        href="/select-customer"
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors mb-12"
      >
        Select a Customer →
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {features.map(({ label, desc }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="text-sm font-semibold text-slate-800 mb-1">{label}</div>
            <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
