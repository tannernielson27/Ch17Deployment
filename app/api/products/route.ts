import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const products = await query(
      'SELECT product_id, product_name, price FROM products ORDER BY product_name'
    )
    return NextResponse.json(products)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
