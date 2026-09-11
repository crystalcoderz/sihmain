import { NextResponse } from 'next/server'
import { pool, mapRoute } from '@/lib/db'
import { applyIncidentToRoute } from '@/src/domain/risk-engine'
import type { Incident } from '@/src/domain/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const TYPES = ['LANDSLIDE', 'FLOOD', 'ROAD DAMAGE', 'BRIDGE DAMAGE', 'TRAFFIC', 'SEVERE WEATHER', 'OTHER']

async function logEvent(incidentId: string, event: string) {
  await pool.query('INSERT INTO incident_events (incident_id, event) VALUES ($1, $2)', [incidentId, event.slice(0, 300)])
}

async function reapplyRoutes(incident: Incident) {
  for (const routeId of incident.affectedRouteIds) {
    const { rows } = await pool.query('SELECT * FROM routes WHERE id = $1', [routeId])
    if (!rows[0]) continue
    const updated = applyIncidentToRoute(mapRoute(rows[0]), incident)
    await pool.query(
      `UPDATE routes SET status=$2, accessibility_score=$3, risk_score=$4, delay_minutes=$5,
         landslide_risk=$6, flood_risk=$7, weather_risk=$8, road_condition_risk=$9 WHERE id=$1`,
      [routeId, updated.status, updated.accessibilityScore, updated.riskScore, updated.delayMinutes,
        updated.landslideRisk, updated.floodRisk, updated.weatherRisk, updated.roadConditionRisk],
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { incident?: Partial<Incident> }
    const i = body.incident
    if (!i) return NextResponse.json({ error: 'incident required' }, { status: 400 })

    const id = String(i.id || `inc-${Date.now()}`).slice(0, 120)
    const type = TYPES.includes(String(i.type)) ? i.type! : 'OTHER'
    const severity = SEVERITIES.includes(String(i.severity)) ? i.severity! : 'MEDIUM'
    const location = String(i.location || 'Unknown').slice(0, 200)
    const description = String(i.description || '').slice(0, 2000)
    const reporter = String(i.reporter || 'Command operator').slice(0, 120)
    const lat = Number(i.coordinates?.lat ?? 0)
    const lng = Number(i.coordinates?.lng ?? 0)
    const affected = Array.isArray(i.affectedRouteIds) ? i.affectedRouteIds.map(String).slice(0, 20) : []
    const createdAt = i.createdAt ? new Date(i.createdAt) : new Date()

    await pool.query(
      `INSERT INTO incidents (id, type, severity, location, lat, lng, description, reporter, created_at, affected_route_ids, sync_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,'SYNCED')
       ON CONFLICT (id) DO UPDATE SET type=EXCLUDED.type, severity=EXCLUDED.severity, location=EXCLUDED.location,
         description=EXCLUDED.description, affected_route_ids=EXCLUDED.affected_route_ids`,
      [id, type, severity, location, lat, lng, description, reporter, createdAt.toISOString(), JSON.stringify(affected)],
    )
    await logEvent(id, `Incident logged: ${severity} ${String(type).toLowerCase()} at ${location}`)
    await reapplyRoutes({ id, type, severity, location, coordinates: { lat, lng }, description, reporter, createdAt: createdAt.toISOString(), affectedRouteIds: affected } as Incident)

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create incident' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; severity?: string; description?: string; note?: string }
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sets: string[] = []
    const params: unknown[] = [body.id]
    if (body.severity && SEVERITIES.includes(body.severity)) { params.push(body.severity); sets.push(`severity = $${params.length}`) }
    if (typeof body.description === 'string') { params.push(body.description.slice(0, 2000)); sets.push(`description = $${params.length}`) }
    if (sets.length) await pool.query(`UPDATE incidents SET ${sets.join(', ')} WHERE id = $1`, params)
    const note = body.note?.trim() || (body.severity ? `Severity updated to ${body.severity}` : 'Incident updated')
    await logEvent(body.id, note)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update incident' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await pool.query('DELETE FROM incident_events WHERE incident_id = $1', [id])
    await pool.query('DELETE FROM incidents WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete incident' }, { status: 500 })
  }
}
