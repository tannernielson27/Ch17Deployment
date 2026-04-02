'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Customer {
  customer_id: number
  full_name: string
  email: string
}

export default function SelectCustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  async function select(id: number) {
    await fetch('/api/set-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: id }),
    })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">Session</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Select a Customer</h1>
      <p className="text-slate-500 text-sm mb-6">No login required — choose who you&apos;re acting as.</p>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-400"
      />

      {loading ? (
        <p className="text-slate-400 text-sm py-4">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm py-4">No customers found.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {filtered.map((c) => (
            <button
              key={c.customer_id}
              onClick={() => select(c.customer_id)}
              className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group"
            >
              <span className="text-sm font-medium text-slate-800 group-hover:text-sky-700">{c.full_name}</span>
              <span className="text-xs text-slate-400 mono">{c.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
