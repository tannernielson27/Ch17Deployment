import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { customer_id } = await req.json()
  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id required' }, { status: 400 })
  }
  const cookieStore = await cookies()
  cookieStore.set('customer_id', String(customer_id), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return NextResponse.json({ ok: true })
}
