import { NextResponse } from 'next/server'
import { pool, mapRoute } from '@/lib/db'
import { applyIncidentToRoute } from '@/src/domain/risk-engine'
import type { Incident } from '@/src/domain/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export async function POST(request: Request) {
  let incident: Incident
  try {
    const body = (await request.json()) as { incident?: Incident }
    if (!body.incident) return NextResponse.json({ error: 'incident required' }, { status: 400 })
    incident = body.incident
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Minimal server-side validation / coercion to protect the database.
  const id = String(incident.id || `inc-${Date.now()}`).slice(0, 120)
  const type = String(incident.type || 'INCIDENT').slice(0, 60)
  const severity = SEVERITIES.includes(incident.severity) ? incident.severity : 'MEDIUM'
  const location = String(incident.location || 'Unknown').slice(0, 200)
  const description = String(incident.description || '').slice(0, 2000)
  const reporter = String(incident.reporter || 'Field officer').slice(0, 120)
  const lat = Number(incident.coordinates?.lat ?? 0)
  const lng = Number(incident.coordinates?.lng ?? 0)
  const affected = Array.isArray(incident.affectedRouteIds)
    ? incident.affectedRouteIds.map(String).slice(0, 20)
    : []
  const createdAt = incident.createdAt ? new Date(incident.createdAt) : new Date()

  try {
    await pool.query(
      `INSERT INTO incidents (id, type, severity, location, lat, lng, description, reporter, created_at, affected_route_ids, sync_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,'SYNCED')
       ON CONFLICT (id) DO UPDATE SET severity = EXCLUDED.severity, description = EXCLUDED.description, sync_status = 'SYNCED'`,
      [id, type, severity, location, lat, lng, description, reporter, createdAt.toISOString(), JSON.stringify(affected)],
    )

    const alertSeverity = severity === 'CRITICAL' ? 'CRITICAL' : severity === 'HIGH' ? 'HIGH' : 'MODERATE'
    await pool.query(
      `INSERT INTO alerts (id, title, description, severity, location, timestamp, status, related_entity)
       VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7)
       ON CONFLICT (id) DO NOTHING`,
      [
        `alert-${id}`,
        `${severity} ${type.toLowerCase()} reported`,
        `${location}: ${description}`.slice(0, 500),
        alertSeverity,
        location,
        'Just now',
        id,
      ],
    )

    for (const routeId of affected) {
      const { rows } = await pool.query('SELECT * FROM routes WHERE id = $1', [routeId])
      if (!rows[0]) continue
      const updated = applyIncidentToRoute(mapRoute(rows[0]), { ...incident, severity, affectedRouteIds: affected })
      await pool.query(
        `UPDATE routes SET status=$2, accessibility_score=$3, risk_score=$4, delay_minutes=$5,
           landslide_risk=$6, flood_risk=$7, weather_risk=$8, road_condition_risk=$9 WHERE id=$1`,
        [
          routeId, updated.status, updated.accessibilityScore, updated.riskScore, updated.delayMinutes,
          updated.landslideRisk, updated.floodRisk, updated.weatherRisk, updated.roadConditionRisk,
        ],
      )
    }

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to persist report' },
      { status: 500 },
    )
  }
}
