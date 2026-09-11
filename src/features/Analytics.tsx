import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Alert, District, Incident, Route, Vehicle, WeatherReading } from '../domain/types'
import { chartPalette as C } from './ui'

interface Props {
  routes: Route[]
  incidents: Incident[]
  vehicles: Vehicle[]
  alerts: Alert[]
  districts: District[]
  weather: WeatherReading[]
  t: (key: string) => string
}

const tooltipStyle = {
  background: '#0b1d34', border: `1px solid ${C.border}`, borderRadius: 6,
  color: '#e5f2fb', fontSize: 11, fontFamily: 'DM Mono, monospace',
}

export function Analytics({ routes, incidents, vehicles, alerts, districts, weather }: Props) {
  const corridorRisk = useMemo(
    () => routes.map((r) => ({ name: r.name.replace(/ Corridor| Highway/gi, '').slice(0, 16), risk: r.riskScore, access: r.accessibilityScore })),
    [routes],
  )

  const incidentTypes = useMemo(() => {
    const counts = new Map<string, number>()
    incidents.forEach((i) => counts.set(i.type, (counts.get(i.type) ?? 0) + 1))
    return [...counts.entries()].map(([name, value]) => ({ name, value }))
  }, [incidents])

  const vehicleStatus = useMemo(() => {
    const counts = new Map<string, number>()
    vehicles.forEach((v) => counts.set(v.status, (counts.get(v.status) ?? 0) + 1))
    return [...counts.entries()].map(([name, value]) => ({ name, value }))
  }, [vehicles])

  const districtRisk = useMemo(
    () => districts.map((d) => ({ subject: d.name.slice(0, 12), risk: d.riskIndex })).slice(0, 8),
    [districts],
  )

  const rainVsRisk = useMemo(() => {
    const byId = new Map(districts.map((d) => [d.id, d.name]))
    return weather.map((w) => ({ name: (byId.get(w.districtId) ?? w.districtId).slice(0, 12), rainfall: w.rainfallMm, risk: w.riskContribution }))
  }, [weather, districts])

  const pieColors = [C.redDeep, C.amberDeep, C.teal, C.blue, C.tealDeep, C.amber]
  const openAlerts = alerts.filter((a) => a.status !== 'RESOLVED').length
  const avgAccess = routes.length ? Math.round(routes.reduce((s, r) => s + r.accessibilityScore, 0) / routes.length) : 0
  const blocked = routes.filter((r) => r.status === 'BLOCKED').length

  return (
    <div className="dashboard">
      <div className="page-heading">
        <span className="eyebrow">OPERATIONAL ANALYTICS</span>
        <h1>Regional <em>situational</em> analytics</h1>
        <p>Live aggregates computed from the operational database — corridor risk, incident composition, fleet posture and meteorological load across the North Eastern Region.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric"><span>Corridors tracked</span><strong>{routes.length}</strong><small>{blocked} blocked</small></div>
        <div className="metric"><span>Avg accessibility</span><strong>{avgAccess}<small style={{ fontSize: 14 }}>%</small></strong><small>network wide</small></div>
        <div className="metric amber"><span>Active incidents</span><strong>{incidents.length}</strong><small>logged</small></div>
        <div className="metric red"><span>Open alerts</span><strong>{openAlerts}</strong><small>need action</small></div>
        <div className="metric"><span>Fleet units</span><strong>{vehicles.length}</strong><small>dispatched</small></div>
        <div className="metric amber"><span>Districts</span><strong>{districts.length}</strong><small>monitored</small></div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card wide-card">
          <div className="card-title"><div><span className="eyebrow">RISK vs ACCESSIBILITY</span><h2>Corridor risk profile</h2></div></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={corridorRisk} margin={{ top: 20, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="name" stroke={C.axis} fontSize={10} tickLine={false} axisLine={{ stroke: C.border }} interval={0} angle={-18} textAnchor="end" height={60} />
              <YAxis stroke={C.axis} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }} />
              <Bar dataKey="risk" name="Risk score" fill={C.redDeep} radius={[3, 3, 0, 0]} />
              <Bar dataKey="access" name="Accessibility" fill={C.teal} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="card-title"><div><span className="eyebrow">COMPOSITION</span><h2>Incident types</h2></div></div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={incidentTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={3} stroke="none">
                {incidentTypes.map((_, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="card-title"><div><span className="eyebrow">FLEET POSTURE</span><h2>Vehicle status</h2></div></div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={vehicleStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} paddingAngle={3} stroke="none">
                {vehicleStatus.map((_, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="card-title"><div><span className="eyebrow">DISTRICT RISK INDEX</span><h2>Exposure radar</h2></div></div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={districtRisk} outerRadius={92}>
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: C.axis, fontSize: 9 }} />
              <Radar dataKey="risk" stroke={C.amberDeep} fill={C.amberDeep} fillOpacity={0.35} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card wide-card">
          <div className="card-title"><div><span className="eyebrow">METEOROLOGICAL LOAD</span><h2>Rainfall vs weather-driven risk by district</h2></div></div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rainVsRisk} margin={{ top: 20, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="name" stroke={C.axis} fontSize={10} tickLine={false} axisLine={{ stroke: C.border }} interval={0} angle={-18} textAnchor="end" height={60} />
              <YAxis stroke={C.axis} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }} />
              <Bar dataKey="rainfall" name="Rainfall (mm)" fill={C.blue} radius={[3, 3, 0, 0]} />
              <Bar dataKey="risk" name="Weather risk" fill={C.amberDeep} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
