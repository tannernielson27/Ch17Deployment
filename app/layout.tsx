import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import { getSelectedCustomer } from '@/lib/customer'

export const metadata: Metadata = {
  title: 'IS 455 Shop',
  description: 'ML Pipeline Web App',
}

const navLinks = [
  { href: '/select-customer', label: 'Select Customer' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/place-order', label: 'Place Order' },
  { href: '/orders', label: 'Order History' },
  { href: '/warehouse/priority', label: 'Priority Queue' },
  { href: '/scoring', label: 'Run Scoring' },
]

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const customer = await getSelectedCustomer()

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">

        {/* Nav */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 flex items-center h-14 gap-1">
            <Link href="/" className="text-sm font-semibold text-slate-900 mr-5 tracking-tight hover:text-sky-600 transition-colors">
              IS 455 / Shop
            </Link>
            <div className="h-4 w-px bg-slate-200 mr-4" />
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </header>

        {/* Customer strip */}
        {customer && (
          <div className="bg-white border-b border-slate-100 px-6 py-1.5">
            <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>
                Acting as <span className="text-slate-700 font-medium">{customer.full_name}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                {customer.email}
              </span>
              <Link href="/select-customer" className="ml-auto text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors">
                change
              </Link>
            </div>
          </div>
        )}

        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
