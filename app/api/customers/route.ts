import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const customers = await query(
      'SELECT customer_id, full_name, email FROM customers ORDER BY full_name'
    )
    return NextResponse.json(customers)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 })
  }
}
