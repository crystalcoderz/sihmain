import { useState } from 'react'
import type { Route, Vehicle } from '../domain/types'
import { Badge, relativeTime } from './ui'

interface Props {
  vehicles: Vehicle[]
  routes: Route[]
  onMutate: () => void
}

const STATUS_FLOW: Record<string, Vehicle['status']> = {
  'IN TRANSIT': 'DELIVERED',
  DELAYED: 'IN TRANSIT',
  'AT RISK': 'IN TRANSIT',
  EMERGENCY: 'IN TRANSIT',
  DELIVERED: 'IN TRANSIT',
}
const NEXT_LABEL: Record<string, string> = {
  'IN TRANSIT': 'Mark delivered',
  DELAYED: 'Resume transit',
  'AT RISK': 'Clear & resume',
  EMERGENCY: 'Stand down',
  DELIVERED: 'Re-dispatch',
}

export function VehicleDispatch({ vehicles, routes, onMutate }: Props) {
  const [busy, setBusy] = useState<string | null>(null)

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id)
    try {
      await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
      onMutate()
    } finally { setBusy(null) }
  }

  const routeName = (id?: string) => (id ? routes.find((r) => r.id === id)?.name ?? id : '—')
  const dispatched = vehicles.filter((v) => v.status !== 'DELIVERED').length
  const emergency = vehicles.filter((v) => v.deliveryPriority === 'EMERGENCY').length

  return (
    <div className="list-page">
      <div className="page-heading">
        <span className="eyebrow">FLEET DISPATCH</span>
        <h1>Vehicle <em>dispatch</em> control</h1>
        <p>Assign corridors, advance delivery status through its lifecycle, and flag emergency priority. Every change writes straight to the operational database.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric"><span>Fleet size</span><strong>{vehicles.length}</strong><small>units</small></div>
        <div className="metric"><span>Active dispatch</span><strong>{dispatched}</strong><small>en route</small></div>
        <div className="metric red"><span>Emergency</span><strong>{emergency}</strong><small>priority</small></div>
        <div className="metric"><span>Delivered</span><strong>{vehicles.length - dispatched}</strong><small>complete</small></div>
      </div>

      <div className="veh-grid">
        {vehicles.map((v) => (
          <div key={v.id} className={`veh-card ${v.deliveryPriority === 'EMERGENCY' ? 'is-emergency' : ''}`}>
            <div className="veh-head">
              <div><strong>{v.vehicleId}</strong><small className="muted">{v.commodity}</small></div>
              <Badge value={v.status} />
            </div>
            <div className="veh-route">
              <span>{v.origin}</span><span className="veh-arrow">→</span><span>{v.destination}</span>
            </div>
            <div className="veh-stats">
              <div><strong>{v.speed}<small>kph</small></strong><span>Speed</span></div>
              <div><strong>{v.eta}</strong><span>ETA</span></div>
              <div><Badge value={v.riskLevel} /><span>Risk</span></div>
            </div>

            <label className="veh-field">Assigned corridor
              <select value={v.assignedRouteId ?? ''} disabled={busy === v.id} onChange={(e) => patch(v.id, { assignedRouteId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>

            <div className="veh-actions">
              <button className="button primary" disabled={busy === v.id} onClick={() => patch(v.id, { status: STATUS_FLOW[v.status] })}>{NEXT_LABEL[v.status]}</button>
              <button
                className={`button ${v.deliveryPriority === 'EMERGENCY' ? 'ghost' : 'danger'}`}
                disabled={busy === v.id}
                onClick={() => patch(v.id, { deliveryPriority: v.deliveryPriority === 'EMERGENCY' ? 'NORMAL' : 'EMERGENCY', status: v.deliveryPriority === 'EMERGENCY' ? v.status : 'EMERGENCY' })}
              >{v.deliveryPriority === 'EMERGENCY' ? 'Clear priority' : 'Flag emergency'}</button>
            </div>
            <small className="muted veh-foot">Corridor: {routeName(v.assignedRouteId)}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
