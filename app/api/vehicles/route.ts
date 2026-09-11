import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = ['IN TRANSIT', 'DELAYED', 'AT RISK', 'DELIVERED', 'EMERGENCY']
const PRIORITIES = ['NORMAL', 'HIGH', 'EMERGENCY']

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string
      status?: string
      deliveryPriority?: string
      assignedRouteId?: string | null
    }
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const sets: string[] = ['last_updated = $2']
    const params: unknown[] = [body.id, 'just now']

    if (body.status && STATUSES.includes(body.status)) { params.push(body.status); sets.push(`status = $${params.length}`) }
    if (body.deliveryPriority && PRIORITIES.includes(body.deliveryPriority)) { params.push(body.deliveryPriority); sets.push(`delivery_priority = $${params.length}`) }
    if (body.assignedRouteId !== undefined) { params.push(body.assignedRouteId); sets.push(`assigned_route_id = $${params.length}`) }

    await pool.query(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = $1`, params)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update vehicle' }, { status: 500 })
  }
}
