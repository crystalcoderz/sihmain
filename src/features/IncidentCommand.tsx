import { useMemo, useState } from 'react'
import type { Incident, IncidentEvent, Route } from '../domain/types'
import { Badge, relativeTime } from './ui'

interface Props {
  incidents: Incident[]
  incidentEvents: IncidentEvent[]
  routes: Route[]
  onMutate: () => void
}

const TYPES = ['LANDSLIDE', 'FLOOD', 'ROAD DAMAGE', 'BRIDGE DAMAGE', 'TRAFFIC', 'SEVERE WEATHER', 'OTHER']
const SEVERITIES: Incident['severity'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function IncidentCommand({ incidents, incidentEvents, routes, onMutate }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'LANDSLIDE', severity: 'HIGH' as Incident['severity'], location: '', description: '', affected: [] as string[] })

  const selected = incidents.find((i) => i.id === selectedId) ?? null
  const timeline = useMemo(
    () => incidentEvents.filter((e) => e.incidentId === selectedId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [incidentEvents, selectedId],
  )
  const routeName = (id: string) => routes.find((r) => r.id === id)?.name ?? id

  async function createIncident(e: React.FormEvent) {
    e.preventDefault()
    if (!form.location.trim()) return
    setBusy('create')
    try {
      const id = `inc-${Date.now()}`
      await fetch('/api/incidents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident: { id, type: form.type, severity: form.severity, location: form.location, description: form.description, reporter: 'Command operator', affectedRouteIds: form.affected, coordinates: { lat: 0, lng: 0 } } }),
      })
      setForm({ type: 'LANDSLIDE', severity: 'HIGH', location: '', description: '', affected: [] })
      setShowForm(false)
      setSelectedId(id)
      onMutate()
    } finally { setBusy(null) }
  }

  async function escalate(incident: Incident, dir: 1 | -1) {
    const idx = SEVERITIES.indexOf(incident.severity)
    const next = SEVERITIES[Math.min(SEVERITIES.length - 1, Math.max(0, idx + dir))]
    if (next === incident.severity) return
    setBusy(incident.id)
    try {
      await fetch('/api/incidents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: incident.id, severity: next, note: `Severity ${dir === 1 ? 'escalated' : 'de-escalated'} to ${next}` }) })
      onMutate()
    } finally { setBusy(null) }
  }

  async function remove(incident: Incident) {
    setBusy(incident.id)
    try {
      await fetch(`/api/incidents?id=${encodeURIComponent(incident.id)}`, { method: 'DELETE' })
      if (selectedId === incident.id) setSelectedId(null)
      onMutate()
    } finally { setBusy(null) }
  }

  return (
    <div className="list-page">
      <div className="page-heading dashboard-title">
        <div>
          <span className="eyebrow">INCIDENT COMMAND</span>
          <h1>Incident <em>command</em> board</h1>
          <p>Log, escalate and resolve field incidents. Each action is recorded to an immutable timeline, and route risk is recomputed automatically when corridors are affected.</p>
        </div>
        <button className="button primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close form' : '+ Log incident'}</button>
      </div>

      {showForm && (
        <form className="planner incident-form" onSubmit={createIncident}>
          <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Incident['severity'] })}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. NH-6 near Sonapur" /></label>
          <label>Affected corridor<select value={form.affected[0] ?? ''} onChange={(e) => setForm({ ...form, affected: e.target.value ? [e.target.value] : [] })}><option value="">None</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label className="wide" style={{ gridColumn: '1 / -1' }}>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief situational note" /></label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button primary" disabled={busy === 'create'}>{busy === 'create' ? 'Logging…' : 'Log to board'}</button>
          </div>
        </form>
      )}

      <div className="incident-layout">
        <div className="table-card">
          <table>
            <thead><tr><th>Incident</th><th>Severity</th><th>Location</th><th>Corridors</th><th>Actions</th></tr></thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className={selectedId === i.id ? 'row-selected' : ''} onClick={() => setSelectedId(i.id)} style={{ cursor: 'pointer' }}>
                  <td><strong style={{ color: '#e5f2fb' }}>{i.type}</strong><br /><small className="muted">{relativeTime(i.createdAt)} · {i.reporter}</small></td>
                  <td><Badge value={i.severity} /></td>
                  <td>{i.location}</td>
                  <td>{i.affectedRouteIds.length ? i.affectedRouteIds.map(routeName).join(', ') : '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="inv-adjust">
                      <button disabled={busy === i.id} onClick={() => escalate(i, 1)} title="Escalate">▲</button>
                      <button disabled={busy === i.id} onClick={() => escalate(i, -1)} title="De-escalate">▼</button>
                      <button disabled={busy === i.id} onClick={() => remove(i)} title="Resolve & remove" className="danger-btn">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card timeline-card">
          <div className="card-title"><div><span className="eyebrow">AUDIT TIMELINE</span><h2>{selected ? selected.type : 'Select an incident'}</h2></div>{selected && <Badge value={selected.severity} />}</div>
          {selected ? (
            <>
              <p className="muted" style={{ fontSize: 11, margin: '8px 0 4px' }}>{selected.location}</p>
              {selected.description && <p style={{ fontSize: 12, color: '#c2d4e6', margin: '0 0 6px' }}>{selected.description}</p>}
              <div className="timeline">
                {timeline.length === 0 && <p className="muted" style={{ fontSize: 11 }}>No events recorded yet.</p>}
                {timeline.map((ev) => (
                  <div key={ev.id} className="timeline-item">
                    <span className="timeline-dot" />
                    <div><strong>{ev.event}</strong><small>{relativeTime(ev.createdAt)}</small></div>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Choose an incident from the board to view its full action history.</p>}
        </div>
      </div>
    </div>
  )
}
