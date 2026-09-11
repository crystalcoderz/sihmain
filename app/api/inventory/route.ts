import { NextResponse } from 'next/server'
import { pool, mapInventory } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORIES = ['Medicines', 'Food', 'Water', 'Shelter', 'Fuel']

export async function GET() {
  const { rows } = await pool.query('SELECT * FROM inventory ORDER BY category, name')
  return NextResponse.json(rows.map(mapInventory), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  try {
    const b = (await request.json()) as {
      name?: string; category?: string; districtId?: string; quantity?: number; unit?: string; threshold?: number
    }
    if (!b.name || !b.districtId) return NextResponse.json({ error: 'name and districtId required' }, { status: 400 })
    const id = `inv-${Date.now()}`
    const category = CATEGORIES.includes(String(b.category)) ? b.category : 'Food'
    await pool.query(
      `INSERT INTO inventory (id, name, category, district_id, quantity, unit, threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, String(b.name).slice(0, 120), category, String(b.districtId).slice(0, 60),
        Math.max(0, Math.round(Number(b.quantity) || 0)), String(b.unit || 'units').slice(0, 30),
        Math.max(0, Math.round(Number(b.threshold) || 0))],
    )
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to add item' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const b = (await request.json()) as { id?: string; delta?: number; quantity?: number }
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (typeof b.delta === 'number') {
      await pool.query('UPDATE inventory SET quantity = GREATEST(0, quantity + $2), updated_at = now() WHERE id = $1', [b.id, Math.round(b.delta)])
    } else if (typeof b.quantity === 'number') {
      await pool.query('UPDATE inventory SET quantity = GREATEST(0, $2), updated_at = now() WHERE id = $1', [b.id, Math.round(b.quantity)])
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update item' }, { status: 500 })
  }
}
