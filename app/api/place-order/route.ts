import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { withTransaction } from '@/lib/db'

interface LineItem {
  product_id: number
  unit_price: number
  quantity: number
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const customerId = cookieStore.get('customer_id')?.value
  if (!customerId) {
    return NextResponse.json({ error: 'No customer selected' }, { status: 401 })
  }

  const { items } = await req.json() as { items: LineItem[] }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 })
  }
  for (const item of items) {
    if (!item.product_id || item.quantity < 1) {
      return NextResponse.json({ error: 'Invalid line item' }, { status: 400 })
    }
  }

  const totalValue = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  try {
    const orderId = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO orders (customer_id, order_datetime, order_total)
         VALUES ($1, NOW(), $2)
         RETURNING order_id`,
        [customerId, totalValue]
      )
      const newOrderId = rows[0].order_id

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [newOrderId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity]
        )
      }
      return newOrderId
    })

    return NextResponse.json({ ok: true, order_id: orderId })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }
}
