'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product { product_id: number; product_name: string; price: number }
interface LineItem { product_id: number; product_name: string; unit_price: number; quantity: number }

export default function PlaceOrderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts)
  }, [])

  function addItem() {
    if (!selectedProduct) return
    const product = products.find((p) => p.product_id === Number(selectedProduct))
    if (!product) return
    if (quantity < 1) { setError('Quantity must be at least 1'); return }
    const existing = lineItems.findIndex((i) => i.product_id === product.product_id)
    if (existing >= 0) {
      const updated = [...lineItems]
      updated[existing].quantity += quantity
      setLineItems(updated)
    } else {
      setLineItems([...lineItems, { product_id: product.product_id, product_name: product.product_name, unit_price: product.price, quantity }])
    }
    setSelectedProduct('')
    setQuantity(1)
    setError('')
  }

  function removeItem(idx: number) { setLineItems(lineItems.filter((_, i) => i !== idx)) }

  const total = lineItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  async function submit() {
    if (lineItems.length === 0) { setError('Add at least one item.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/place-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lineItems }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to place order.'); setSubmitting(false); return }
    router.push('/orders?success=1')
  }

  return (
    <div className="max-w-xl">
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">New Order</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">Place Order</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Add item */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-medium">Add Item</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Select...</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} — ${Number(p.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="text-xs text-slate-500 block mb-1">Qty</label>
            <input
              type="number" min={1} value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <button onClick={addItem} className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-xs text-slate-400 font-medium">Product</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Qty</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Unit</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-400 font-medium">Total</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 text-slate-700 font-medium">{item.product_name}</td>
                  <td className="px-5 py-3 text-right mono text-slate-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-right mono text-slate-600">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right mono font-semibold text-slate-800">${(item.unit_price * item.quantity).toFixed(2)}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 text-xs transition-colors">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={3} className="px-5 py-3 text-right text-xs text-slate-500 font-medium uppercase tracking-wide">Order Total</td>
                <td className="px-5 py-3 text-right mono font-bold text-slate-900">${total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting || lineItems.length === 0}
        className="w-full bg-slate-900 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {submitting ? 'Placing Order...' : 'Place Order'}
      </button>
    </div>
  )
}
