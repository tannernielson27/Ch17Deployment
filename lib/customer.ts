import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { queryOne } from './db'

export interface Customer {
  customer_id: number
  full_name: string
  email: string
}

export async function getSelectedCustomer(): Promise<Customer | null> {
  const cookieStore = await cookies()
  const id = cookieStore.get('customer_id')?.value
  if (!id) return null

  try {
    return await queryOne<Customer>(
      'SELECT customer_id, full_name, email FROM customers WHERE customer_id = $1',
      [id]
    ) ?? null
  } catch {
    // DB not yet connected (e.g. DATABASE_URL not set) — degrade gracefully
    return null
  }
}

export async function requireCustomer(): Promise<Customer> {
  const customer = await getSelectedCustomer()
  if (!customer) redirect('/select-customer')
  return customer
}
