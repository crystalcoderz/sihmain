'use client'

import { translate } from './portal-copy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { alerts as seedAlerts, districts, incidents as seedIncidents, routes as seedRoutes, supplyPoints, vehicles as seedVehicles } from './data/seed'
import { applyIncidentToRoute, calculateRouteRisk } from './domain/risk-engine'
import type { Alert, AlertStatus, FieldReportDraft, Incident, IncidentEvent, IncidentSeverity, IncidentType, InventoryItem, RiskLevel, Route, Vehicle, WeatherReading } from './domain/types'
import { strings, type Language } from './i18n'
import { GoogleMapProvider } from './services/google-map-provider'
import { VoiceNote } from './components/VoiceNote'
import { offlineQueue } from './services/offline-queue'
import { Analytics } from './features/Analytics'
import { Inventory } from './features/Inventory'
import { Weather } from './features/Weather'
import { IncidentCommand } from './features/IncidentCommand'
import { VehicleDispatch } from './features/VehicleDispatch'

type Page = 'dashboard' | 'map' | 'routes' | 'vehicles' | 'incidents' | 'alerts' | 'districts' | 'analytics' | 'weather' | 'inventory' | 'emergency' | 'reports' | 'settings'
const nav: { id: Page; key: keyof ReturnType<typeof strings> }[] = [{ id: 'dashboard', key: 'dashboard' }, { id: 'analytics', key: 'analytics' }, { id: 'map', key: 'map' }, { id: 'routes', key: 'routes' }, { id: 'vehicles', key: 'vehicles' }, { id: 'incidents', key: 'incidents' }, { id: 'weather', key: 'weather' }, { id: 'inventory', key: 'inventory' }, { id: 'alerts', key: 'alerts' }, { id: 'districts', key: 'districts' }, { id: 'emergency', key: 'emergency' }, { id: 'reports', key: 'reports' }, { id: 'settings', key: 'settings' }]
const riskClass = (risk: RiskLevel | IncidentSeverity) => ({ LOW: 'low', MODERATE: 'moderate', MEDIUM: 'moderate', HIGH: 'high', CRITICAL: 'critical' }[risk])
const statusClass = (status: string) => status.toLowerCase().replaceAll(' ', '-')
const fmtTime = (date: string) => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))

function Badge({ value }: { value: string }) { return <span className={`badge ${riskClass(value as RiskLevel) ?? statusClass(value)}`}>{value}</span> }
function Metric({ label, value, delta, tone = '' }: { label: string; value: string | number; delta?: string; tone?: string }) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong>{delta && <small>{delta}</small>}</article> }

function MapCanvas({ routes, incidents, vehicles, compact = false, supplies = true, theme = 'dark' }: { routes: Route[]; incidents: Incident[]; vehicles: Vehicle[]; compact?: boolean; supplies?: boolean; theme?: 'dark' | 'light' }) {
  const ref = useRef<HTMLDivElement>(null); const [error, setError] = useState<string | null>(null)
  useEffect(() => { const provider = new GoogleMapProvider(); if (!ref.current) return; provider.render(ref.current, { routes, incidents, vehicles, supplyPoints: supplies ? supplyPoints : [], theme }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Map unavailable.')); return () => provider.destroy() }, [routes, incidents, vehicles, supplies, theme])
  if (error) return <div className="map-fallback"><div><span className="eyebrow">{translate("MAP CONFIGURATION REQUIRED")}</span><h3>{translate("Google Maps is ready to connect")}</h3><p>{error}</p><code>{translate("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_restricted_key")}</code><p className="muted">{translate("Enable Maps JavaScript API. Routes, incidents, vehicles, and supply points will render automatically once configured.")}</p></div></div>
  return <div className={compact ? 'map map-compact map-frame' : 'map map-frame'} aria-label="Interactive operational map"><div ref={ref} className="map-canvas" />{theme !== 'light' && <div className="map-tint" />}</div>
}

function RouteDetails({ route, incidents }: { route: Route; incidents: Incident[] }) { const risk = calculateRouteRisk(route, incidents); return <section className="detail-panel"><div className="split"><div><span className="eyebrow">{translate("CORRIDOR ASSESSMENT")}</span><h2>{route.name}</h2><p>{route.origin}{translate(" → ")}{route.destination}{translate(" · ")}{route.distanceKm}{translate(" km")}</p></div><Badge value={route.status} /></div><div className="score-row"><div><strong>{route.accessibilityScore}{translate("%")}</strong><span>{translate("Accessibility")}</span></div><div><strong>{risk.score}</strong><span>{translate("Risk score")}</span></div><div><strong>{Math.floor(risk.delayMinutes / 60)}{translate("h ")}{risk.delayMinutes % 60}{translate("m")}</strong><span>{translate("Predicted delay")}</span></div></div><h4>{translate("Why this assessment?")}</h4><ul>{risk.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul><p className="action-note">{translate("Recommended action: ")}{risk.recommendation}</p></section> }

type LayerName = 'routes' | 'incidents' | 'vehicles' | 'supplies'
function MapOperations({ routes, incidents, vehicles, selectedRouteId, onSelect }: { routes: Route[]; incidents: Incident[]; vehicles: Vehicle[]; selectedRouteId: string; onSelect: (id: string) => void }) {
  const [layers, setLayers] = useState<Record<LayerName, boolean>>({ routes: true, incidents: true, vehicles: true, supplies: true }); const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL')
  const filteredRoutes = routes.filter((route) => riskFilter === 'ALL' || calculateRouteRisk(route, incidents).level === riskFilter); const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0]
  const toggle = (layer: LayerName) => setLayers((current) => ({ ...current, [layer]: !current[layer] }))
  return <div className="map-page"><section className="page-heading"><span className="eyebrow">{translate("GOOGLE MAPS PLATFORM · DEMO DATA")}</span><h1>{translate("Live operational map")}</h1><p>{translate("Filter live operational layers, inspect corridor evidence, and identify the next decision point.")}</p></section><section className="map-controlbar"><div><span className="eyebrow">{translate("MAP LAYERS")}</span><div className="layer-buttons">{([{ id: 'routes', label: 'Routes' }, { id: 'incidents', label: 'Incidents' }, { id: 'vehicles', label: 'Vehicles' }, { id: 'supplies', label: 'Supply points' }] as { id: LayerName; label: string }[]).map((layer) => <button key={layer.id} onClick={() => toggle(layer.id)} className={layers[layer.id] ? 'layer-on' : ''}><i />{layer.label}</button>)}</div></div><label>{translate("Risk focus")}<select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'ALL' | RiskLevel)}><option value="ALL">{translate("All corridors")}</option><option value="CRITICAL">{translate("CRITICAL")}</option><option value="HIGH">{translate("HIGH")}</option><option value="MODERATE">{translate("MODERATE")}</option><option value="LOW">{translate("LOW")}</option></select></label><div className="map-count"><strong>{filteredRoutes.length}</strong><span>{translate("corridors visible")}</span></div></section><div className="map-shell"><MapCanvas routes={layers.routes ? filteredRoutes : []} incidents={layers.incidents ? incidents : []} vehicles={layers.vehicles ? vehicles : []} supplies={layers.supplies} /><aside className="map-sidebar"><h3>{translate("Corridor layers")}</h3><p className="muted">{layers.routes ? 'Routes' : ''}{layers.incidents ? ' · Incidents' : ''}{layers.vehicles ? ' · Vehicles' : ''}{layers.supplies ? ' · Supply points' : ''}</p><h4>{translate("Route inspection")}</h4>{filteredRoutes.length ? filteredRoutes.map((route) => <button key={route.id} onClick={() => onSelect(route.id)} className={`route-choice ${route.id === selectedRouteId ? 'selected' : ''}`}><span>{route.name}</span><Badge value={route.status} /></button>) : <p className="empty-state">{translate("No corridors match this risk focus.")}</p>}<RouteDetails route={selectedRoute} incidents={incidents} /></aside></div></div>
}

function FieldReports({ language, simulatedOffline, setSimulatedOffline, onSubmit, pending }: { simulatedOffline: boolean; setSimulatedOffline: (value: boolean) => void; onSubmit: (report: FieldReportDraft) => Promise<void>; pending: number; language: Language }) {
  const [type, setType] = useState<IncidentType>('LANDSLIDE'); const [severity, setSeverity] = useState<IncidentSeverity>('CRITICAL'); const [location, setLocation] = useState(''); const [description, setDescription] = useState(''); const [coords, setCoords] = useState({ lat: 26.1445, lng: 91.7362 }); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  const capture = () => navigator.geolocation?.getCurrentPosition((position) => { setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }); setMessage('GPS location captured. Add a readable location before submitting.') }, () => setMessage('GPS unavailable. Enter the coordinates manually.'))
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!location.trim() || !description.trim()) { setMessage('Location and description are required.'); return } setBusy(true); const report: FieldReportDraft = { localReportId: crypto.randomUUID(), incidentType: type, severity, latitude: coords.lat, longitude: coords.lng, location, description, reporter: 'Field Officer — Demo Unit', createdAt: new Date().toISOString(), syncStatus: simulatedOffline ? 'QUEUED_OFFLINE' : 'SYNCING', retryCount: 0 }; await onSubmit(report); setMessage(simulatedOffline ? 'Saved locally. Pending synchronization.' : 'Report synchronized with command center.'); setLocation(''); setDescription(''); setBusy(false) }
  return <div className="field-layout"><section className="field-card"><div className="split"><div><span className="eyebrow">{translate("FIELD OFFICER WORKFLOW")}</span><h2>{translate("Report an incident")}</h2></div><span className={`network ${simulatedOffline ? 'offline' : 'online'}`}>{simulatedOffline ? `OFFLINE · ${pending} PENDING` : 'ONLINE · SYNC READY'}</span></div><div className="simulation"><span><strong>{translate("Offline simulation")}</strong><small>{translate("Uses the real IndexedDB queue and sync flow.")}</small></span><button className={simulatedOffline ? 'button warn' : 'button ghost'} onClick={() => setSimulatedOffline(!simulatedOffline)}>{simulatedOffline ? 'RESTORE CONNECTION' : 'GO OFFLINE'}</button></div><VoiceNote language={language} offline={simulatedOffline} onApply={(text) => setDescription(current => current ? `${current}\n${text}` : text)} /><form onSubmit={submit}><div className="form-grid"><label>{translate("Incident type")}<select value={type} onChange={(e) => setType(e.target.value as IncidentType)}>{(['LANDSLIDE', 'FLOOD', 'ROAD DAMAGE', 'BRIDGE DAMAGE', 'TRAFFIC', 'SEVERE WEATHER', 'OTHER'] as IncidentType[]).map((item) => <option key={item} value={item}>{translate(item)}</option>)}</select></label><label>{translate("Severity")}<select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>{(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IncidentSeverity[]).map((item) => <option key={item} value={item}>{translate(item)}</option>)}</select></label><label className="wide">{translate("Readable location")}<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={translate("Village, district, nearest landmark")} /></label><label>{translate("Latitude")}<input type="number" step="any" value={coords.lat} onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) })} /></label><label>{translate("Longitude")}<input type="number" step="any" value={coords.lng} onChange={(e) => setCoords({ ...coords, lng: Number(e.target.value) })} /></label><label className="wide">{translate("Situation description")}<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={translate("What is blocked, damaged, or unsafe?")} /></label></div><div className="form-actions"><button type="button" className="button ghost" onClick={capture}>{translate("CAPTURE GPS")}</button><button disabled={busy} className="button primary">{busy ? 'SAVING…' : simulatedOffline ? 'SAVE OFFLINE REPORT' : 'SUBMIT TO COMMAND CENTER'}</button></div>{message && <p className="form-message">{message}</p>}</form></section><section className="how-it-works"><span className="eyebrow">{translate("SYNC PIPELINE")}</span><ol><li>{translate("Validate and assign an idempotency ID")}</li><li>{translate("Store locally in IndexedDB")}</li><li>{translate("Queue while offline")}</li><li>{translate("Synchronize on reconnect")}</li><li>{translate("Trigger incident reaction engine")}</li></ol><p>{translate("Photo capture is intentionally deferred until an approved storage provider is selected; no image is silently sent to a third party.")}</p></section></div>
}

export interface InitialState { routes: Route[]; incidents: Incident[]; vehicles: Vehicle[]; alerts: Alert[]; weather: WeatherReading[]; inventory: InventoryItem[]; incidentEvents: IncidentEvent[] }

function App({ initial }: { initial: InitialState }) {
  const [page, setPage] = useState<Page>('dashboard'); const [routes, setRoutes] = useState(initial.routes); const [incidents, setIncidents] = useState(initial.incidents); const [alerts, setAlerts] = useState(initial.alerts); const [vehicles, setVehicles] = useState(initial.vehicles); const [simulatedOffline, setSimulatedOffline] = useState(false); const [pending, setPending] = useState(0); const [selectedRouteId, setSelectedRouteId] = useState('r1'); const [language, updateLanguage] = useState<Language>('en'); const [emergency, setEmergency] = useState(false); const restoreConnectionRef = useRef<() => Promise<void>>(async () => undefined)
  const [weather, setWeather] = useState(initial.weather); const [inventory, setInventory] = useState(initial.inventory); const [incidentEvents, setIncidentEvents] = useState(initial.incidentEvents)
  const refresh = async () => { try { const res = await fetch('/api/state', { cache: 'no-store' }); if (!res.ok) return; const data = await res.json(); setRoutes(data.routes); setIncidents(data.incidents); setVehicles(data.vehicles); setAlerts(data.alerts); setWeather(data.weather); setInventory(data.inventory); setIncidentEvents(data.incidentEvents) } catch { /* offline — keep current state */ } }
  const setLanguage = (next: Language) => { localStorage.setItem('ner-language', next); updateLanguage(next); document.documentElement.lang = next }
  useEffect(() => { document.documentElement.lang = language }, [language])
  useEffect(() => { const stored = localStorage.getItem('ner-language'); if (stored === 'en' || stored === 'hi') updateLanguage(stored) }, [])
  const t = strings(language)
  const metrics = useMemo(() => ({ accessible: routes.filter((route) => route.status === 'OPEN').length, restricted: routes.filter((route) => route.status === 'RESTRICTED').length, blocked: routes.filter((route) => route.status === 'BLOCKED').length, critical: routes.filter((route) => calculateRouteRisk(route, incidents).level === 'CRITICAL').length }), [routes, incidents])
  useEffect(() => { offlineQueue.pendingCount().then(setPending).catch(() => undefined) }, [])
  useEffect(() => { const timer = window.setInterval(() => setVehicles((items) => items.map((vehicle) => vehicle.status === 'IN TRANSIT' || vehicle.status === 'AT RISK' ? { ...vehicle, coordinates: { lat: vehicle.coordinates.lat + .002, lng: vehicle.coordinates.lng + .001 }, lastUpdated: 'just now' } : vehicle)), 8000); return () => window.clearInterval(timer) }, [])
  const syncReport = async (report: FieldReportDraft) => { const incident: Incident = { id: report.serverId ?? `inc-${report.localReportId}`, type: report.incidentType, severity: report.severity, location: report.location, coordinates: { lat: report.latitude, lng: report.longitude }, description: report.description, reporter: report.reporter, createdAt: report.createdAt, affectedRouteIds: [selectedRouteId], syncStatus: 'SYNCED' }; setIncidents((items) => [incident, ...items]); setRoutes((items) => items.map((route) => applyIncidentToRoute(route, incident))); const level: RiskLevel = report.severity === 'CRITICAL' ? 'CRITICAL' : report.severity === 'HIGH' ? 'HIGH' : 'MODERATE'; setAlerts((items) => [{ id: `alert-${report.localReportId}`, title: `${report.severity} ${report.incidentType.toLowerCase()} reported`, description: `${report.location}: ${report.description}`, severity: level, location: report.location, timestamp: 'Just now', status: 'NEW', relatedEntity: incident.id }, ...items]); void fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ incident }) }).catch(() => undefined); await offlineQueue.update(report.localReportId, { syncStatus: 'SYNCED', serverId: incident.id, lastSyncAttempt: new Date().toISOString() }); setPending(await offlineQueue.pendingCount()) }
  const submitReport = async (report: FieldReportDraft) => { await offlineQueue.save(report); if (!simulatedOffline) await syncReport(report); else setPending(await offlineQueue.pendingCount()) }
  const restoreConnection = async () => { setSimulatedOffline(false); const queued = await offlineQueue.byStatus('QUEUED_OFFLINE', 'FAILED'); for (const report of queued) { await offlineQueue.update(report.localReportId, { syncStatus: 'SYNCING', lastSyncAttempt: new Date().toISOString() }); await syncReport({ ...report, syncStatus: 'SYNCING' }) } setPending(await offlineQueue.pendingCount()) }
  restoreConnectionRef.current = restoreConnection
  const changeAlert = (id: string, status: AlertStatus) => { setAlerts((items) => items.map((alert) => alert.id === id ? { ...alert, status } : alert)); void fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).catch(() => undefined) }
  useEffect(() => { if (simulatedOffline) return; const synchronizeOnReconnect = () => { void restoreConnectionRef.current() }; window.addEventListener('online', synchronizeOnReconnect); return () => window.removeEventListener('online', synchronizeOnReconnect) }, [simulatedOffline])
  const content = () => {
    if (page === 'map') return <MapOperations routes={routes} incidents={incidents} vehicles={vehicles} selectedRouteId={selectedRouteId} onSelect={setSelectedRouteId} />
    if (page === 'routes') return <RouteIntelligence routes={routes} incidents={incidents} onSelect={setSelectedRouteId} />
    if (page === 'reports') return <FieldReports language={language} simulatedOffline={simulatedOffline} setSimulatedOffline={(value) => value ? setSimulatedOffline(true) : restoreConnection()} onSubmit={submitReport} pending={pending} />
    if (page === 'vehicles') return <VehicleDispatch vehicles={vehicles} routes={routes} onMutate={refresh} />
    if (page === 'incidents') return <IncidentCommand incidents={incidents} incidentEvents={incidentEvents} routes={routes} onMutate={refresh} />
    if (page === 'analytics') return <Analytics routes={routes} incidents={incidents} vehicles={vehicles} alerts={alerts} districts={districts} weather={weather} t={translate} />
    if (page === 'weather') return <Weather weather={weather} districts={districts} onMutate={refresh} />
    if (page === 'inventory') return <Inventory inventory={inventory} districts={districts} onMutate={refresh} />
    if (page === 'alerts') return <AlertsPage alerts={alerts} onChange={changeAlert} />
    if (page === 'districts') return <DistrictPage incidents={incidents} />
    if (page === 'emergency') return <EmergencyPage active={emergency} onToggle={() => setEmergency(!emergency)} metrics={metrics} vehicles={vehicles} routes={routes} />
    if (page === 'settings') return <Settings language={language} setLanguage={setLanguage} />
    return <Dashboard routes={routes} incidents={incidents} vehicles={vehicles} alerts={alerts} metrics={metrics} weather={weather} onMap={() => setPage('map')} onRoute={setSelectedRouteId} onNavigate={setPage} language={language} offline={simulatedOffline} onAlertChange={changeAlert} />
  }
  return <div className={emergency ? 'app emergency-active' : 'app'}><aside className="sidebar"><div className="brand"><div className="brand-mark">{translate("N")}</div><div><strong>{translate("NER SENTINEL")}</strong><span>{translate("OPERATIONS COMMAND")}</span></div></div><nav>{nav.map((item) => <button key={item.id} onClick={() => setPage(item.id)} className={page === item.id ? 'active' : ''}><span className="nav-dot" />{t[item.key]}</button>)}</nav><div className="sidebar-footer"><span className="demo-label">{translate("DEMO MODE")}</span><p>{translate("Deterministic risk engine")}<br />{translate("Simulated GPS & weather")}</p></div></aside><main className={page === 'dashboard' ? 'main-light' : ''}>{page !== 'dashboard' && <header className="topbar"><div><span className="eyebrow">{translate("NORTH EASTERN REGION · ")}{emergency ? 'EMERGENCY OPERATIONS ACTIVE' : 'SYSTEM STATUS'}</span><strong>{emergency ? 'Priority response view' : 'All systems monitoring'}</strong></div><div className="top-actions"><span className={`network ${simulatedOffline ? 'offline' : 'online'}`}>{simulatedOffline ? `${pending} OFFLINE QUEUED` : 'ONLINE'}</span><button className="language" onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}>{language === 'en' ? 'हि' : 'EN'}</button><span className="clock">{translate("11 SEP 2026 · 14:32 IST")}</span></div></header>}{content()}</main></div>
}

function StatCard({ icon, value, label, delta, trend, accent }: { icon: React.ReactNode; value: React.ReactNode; label: string; delta: string; trend: 'up' | 'down'; accent?: boolean }) {
  return <div className={accent ? 'logi-stat logi-stat-accent' : 'logi-stat'}><div className="logi-stat-top"><span className="logi-stat-ico">{icon}</span><span className={`logi-stat-delta ${trend}`}>{trend === 'up' ? '↑' : '↓'} {delta}</span></div><strong>{value}</strong><span className="logi-stat-label">{label}</span></div>
}

const ICONS = {
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5h10v9H3z" /><path d="M13 9.5h4l4 3.5V15.5h-8z" /><circle cx="7" cy="17.5" r="1.7" /><circle cx="17.5" cy="17.5" r="1.7" /></svg>,
  cloud: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 17a4 4 0 01-.3-8 5.2 5.2 0 0110-1.2A3.6 3.6 0 0116.8 17z" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12.2l2.6 2.6L16.2 9" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5l8.5 15h-17z" /><path d="M12 10v4" /><path d="M12 17h.01" /></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>,
  swap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h12l-3.5-3.5" /><path d="M17 17H5l3.5 3.5" /></svg>,
}

function Dashboard({ routes, incidents, vehicles, alerts, metrics, weather, onMap, onRoute, onNavigate, language, offline, onAlertChange }: { routes: Route[]; incidents: Incident[]; vehicles: Vehicle[]; alerts: Alert[]; metrics: { accessible: number; restricted: number; blocked: number; critical: number }; weather: WeatherReading[]; onMap: () => void; onRoute: (id: string) => void; onNavigate: (page: Page) => void; language: Language; offline: boolean; onAlertChange: (id: string, status: AlertStatus) => void }) {
  const [voiceLog, setVoiceLog] = useState<string[]>([])
  const origins = Array.from(new Set(routes.map((r) => r.origin)))
  const destinations = Array.from(new Set(routes.map((r) => r.destination)))
  const [origin, setOrigin] = useState(origins[0] ?? 'Guwahati')
  const [destination, setDestination] = useState(destinations[0] ?? 'Aizawl')
  const [liveTraffic, setLiveTraffic] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? translate('Good morning') : hour < 17 ? translate('Good afternoon') : translate('Good evening')
  const inTransit = vehicles.filter((v) => v.status === 'IN TRANSIT' || v.status === 'AT RISK').length
  const onTime = vehicles.length ? Math.round(((vehicles.length - vehicles.filter((v) => v.status === 'DELAYED' || v.status === 'AT RISK').length) / vehicles.length) * 100) : 100
  const ranked = [...routes].sort((a, b) => calculateRouteRisk(a, incidents).score - calculateRouteRisk(b, incidents).score)
  const highRisk = routes.filter((r) => { const l = calculateRouteRisk(r, incidents).level; return l === 'HIGH' || l === 'CRITICAL' }).length
  const severeWeather = weather.filter((w) => w.condition === 'HEAVY RAIN' || w.condition === 'STORM' || w.condition === 'FOG')
  const weatherAlertCount = severeWeather.length || weather.length
  const recommended = ranked[0]
  const recRisk = recommended ? calculateRouteRisk(recommended, incidents) : null
  const others = ranked.slice(1, 3)
  const lead = [...weather].sort((a, b) => b.riskContribution - a.riskContribution)[0]
  const leadDistrict = lead ? districts.find((d) => d.id === lead.districtId) : undefined
  const upcoming = vehicles.slice(0, 4)
  const weatherList = [...weather].sort((a, b) => b.riskContribution - a.riskContribution).slice(0, 3)
  const newsFeed = alerts.slice(0, 3)
  const findBest = () => { const match = [...routes].filter((r) => r.origin === origin || r.destination === destination).sort((a, b) => calculateRouteRisk(a, incidents).score - calculateRouteRisk(b, incidents).score)[0] ?? recommended; if (match) onRoute(match.id); onNavigate('routes') }
  const tone = (lvl: RiskLevel) => lvl === 'LOW' ? 'low' : lvl === 'MODERATE' ? 'moderate' : 'high'
  const riskLabel = (lvl: RiskLevel) => lvl === 'LOW' ? translate('Low Risk') : lvl === 'MODERATE' ? translate('Moderate Risk') : translate('High Risk')
  const eta = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`

  return (
    <div className="logi-dash">
      <header className="logi-top">
        <div className="logi-greet"><h1>{greeting}, {translate('Commander')}</h1><p>{translate("Here's the latest update on your logistics network.")}</p></div>
        <div className="logi-top-right">
          <div className="logi-search">{ICONS.search}<input placeholder={translate('Search location, route, or shipment…')} aria-label={translate('Search')} /></div>
          <div className="logi-status"><span className={`logi-net ${offline ? 'off' : 'on'}`}>{offline ? translate('OFFLINE') : translate('ONLINE')}</span><small>{translate('Fri, 12 Sep 2026 · 10:27 AM')}</small></div>
        </div>
      </header>

      <section className="logi-stats">
        <StatCard icon={ICONS.truck} value={vehicles.length} label={translate('Active Shipments')} delta={`${inTransit} ${translate('in transit')}`} trend="up" />
        <StatCard icon={ICONS.cloud} value={weatherAlertCount} label={translate('Weather Alerts')} delta={`${severeWeather.length} ${translate('severe')}`} trend="down" />
        <StatCard icon={ICONS.check} value={`${onTime}%`} label={translate('On-Time Delivery')} delta={translate('fleet on schedule')} trend="up" accent />
        <StatCard icon={ICONS.warn} value={highRisk} label={translate('High-Risk Routes')} delta={`${metrics.blocked} ${translate('blocked')}`} trend={highRisk ? 'down' : 'up'} />
      </section>

      <div className="logi-main">
        <section className="logi-map-card">
          <div className="logi-planner">
            <label className="logi-field"><span className="logi-pin" /><select value={origin} onChange={(e) => setOrigin(e.target.value)}>{origins.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
            <button className="logi-swap" onClick={() => { const o = origin; setOrigin(destination); setDestination(o) }} aria-label={translate('Swap origin and destination')}>{ICONS.swap}</button>
            <label className="logi-field"><span className="logi-pin dest" /><select value={destination} onChange={(e) => setDestination(e.target.value)}>{destinations.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
            <button className="logi-find" onClick={findBest}>{translate('Find Best Route')}</button>
          </div>
          <div className="logi-map-stage">
            <MapCanvas routes={routes} incidents={incidents} vehicles={vehicles} theme="light" />
            <div className="logi-legend"><span className="lg low">{translate('Low Risk')}</span><span className="lg moderate">{translate('Moderate Risk')}</span><span className="lg high">{translate('High Risk')}</span></div>
            <button className={`logi-traffic ${liveTraffic ? 'on' : ''}`} onClick={() => setLiveTraffic(!liveTraffic)}>{translate('Live Traffic')}<i /></button>
          </div>
        </section>

        <aside className="logi-side">
          {lead && <div className="logi-weather">
            <div className="logi-weather-head"><span>{leadDistrict ? `${leadDistrict.name}, ${leadDistrict.state}` : translate('Regional')}</span></div>
            <div className="logi-weather-body"><strong>{Math.round(lead.tempC)}°C</strong><span>{translate(lead.condition)}</span></div>
            <ul><li><span>{translate('Precipitation')}</span><b>{lead.rainfallMm} mm</b></li><li><span>{translate('Wind')}</span><b>{Math.round(lead.windKph)} km/h</b></li><li><span>{translate('Risk load')}</span><b>{lead.riskContribution}</b></li></ul>
          </div>}

          {recommended && recRisk && <div className="logi-rec">
            <div className="logi-rec-head"><h3>{translate('Recommended Route')}</h3><span className={`logi-tag ${tone(recRisk.level)}`}>{recRisk.level === 'LOW' ? translate('Safest Option') : riskLabel(recRisk.level)}</span></div>
            <p className="logi-rec-path">{recommended.origin} <b>→</b> {recommended.destination}</p>
            <div className="logi-rec-stats"><div><span>{translate('Distance')}</span><b>{recommended.distanceKm} km</b></div><div><span>{translate('Est. Time')}</span><b>{eta(recommended.etaMinutes + recRisk.delayMinutes)}</b></div><div><span>{translate('Risk Level')}</span><b className={`tone-${tone(recRisk.level)}`}>{recRisk.level}</b></div></div>
            <p className="logi-rec-note">{recRisk.recommendation}</p>
          </div>}

          <div className="logi-others">
            <div className="logi-panel-head"><h4>{translate('Other Routes')}</h4><button className="logi-link" onClick={() => onNavigate('routes')}>{translate('View All')}</button></div>
            {others.map((r) => { const rk = calculateRouteRisk(r, incidents); return <button key={r.id} className="logi-other" onClick={() => { onRoute(r.id); onNavigate('routes') }}><div><strong>{r.name}</strong><span>{r.distanceKm} km · {eta(r.etaMinutes + rk.delayMinutes)}</span></div><span className={`logi-tag ${tone(rk.level)}`}>{riskLabel(rk.level)}</span></button> })}
          </div>
        </aside>
      </div>

      <div className="logi-bottom">
        <section className="logi-panel">
          <div className="logi-panel-head"><h4>{translate('Upcoming Shipments')}</h4><button className="logi-link" onClick={() => onNavigate('vehicles')}>{translate('View All')}</button></div>
          <ul className="logi-ship-list">{upcoming.map((v) => <li key={v.id}><span className="logi-ship-id">{v.vehicleId}</span><span className="logi-ship-route">{v.origin} <b>→</b> {v.destination}</span><span className={`logi-pill ${v.status === 'DELAYED' ? 'red' : v.status === 'AT RISK' ? 'amber' : v.status === 'DELIVERED' ? 'green' : 'blue'}`}>{translate(v.status)}</span></li>)}</ul>
        </section>

        <section className="logi-panel">
          <div className="logi-panel-head"><h4>{translate('Weather Alerts')} ({weatherAlertCount})</h4><button className="logi-link" onClick={() => onNavigate('weather')}>{translate('View All')}</button></div>
          <ul className="logi-wx-list">{weatherList.map((w) => { const d = districts.find((x) => x.id === w.districtId); return <li key={w.id}><span className={`logi-wx-dot ${w.riskContribution >= 14 ? 'high' : w.riskContribution >= 8 ? 'moderate' : 'low'}`} /><div><strong>{translate(w.condition)}</strong><span>{d ? `${d.name}, ${d.state}` : ''}</span></div><small>{Math.round(w.windKph)} km/h</small></li> })}</ul>
        </section>

        <section className="logi-panel">
          <div className="logi-panel-head"><h4>{translate('News & Updates')}</h4><button className="logi-link" onClick={() => onNavigate('alerts')}>{translate('View All')}</button></div>
          <ul className="logi-news-list">{newsFeed.map((a) => <li key={a.id}><span className="logi-news-ico" /><div><strong>{a.title}</strong><span>{a.location} · {a.timestamp}</span></div>{a.status === 'NEW' ? <button className="logi-ack" onClick={() => onAlertChange(a.id, 'ACKNOWLEDGED')}>{translate('Ack')}</button> : null}</li>)}</ul>
        </section>
      </div>

      <section className="logi-panel logi-voice">
        <div className="logi-panel-head"><h4>{translate('AI Voice Intake')}</h4><button className="logi-link" onClick={onMap}>{translate('Open live map')}</button></div>
        <VoiceNote language={language} offline={offline} onApply={(text) => setVoiceLog((log) => [text, ...log].slice(0, 4))} />
        {voiceLog.length > 0 && <div className="logi-voice-log">{voiceLog.map((entry, i) => <p key={i}>{entry}</p>)}</div>}
      </section>
    </div>
  )
}

function RouteIntelligence({ routes, incidents, onSelect }: { routes: Route[]; incidents: Incident[]; onSelect: (id: string) => void }) { const [origin, setOrigin] = useState('Guwahati'); const [destination, setDestination] = useState('Aizawl'); const candidate = routes.filter((route) => route.origin === origin || route.destination === destination).sort((a, b) => calculateRouteRisk(a, incidents).score - calculateRouteRisk(b, incidents).score); const recommended = candidate[0] ?? routes[0]; const alternate = routes.filter((route) => route.id !== recommended.id).sort((a, b) => calculateRouteRisk(a, incidents).score - calculateRouteRisk(b, incidents).score)[0]; return <div className="route-page"><section className="page-heading"><span className="eyebrow">{translate("EXPLAINABLE ROUTE INTELLIGENCE")}</span><h1>{translate("Plan a resilient delivery")}</h1><p>{translate("Scores are deterministic and calculated from route, weather, terrain, road and incident factors.")}</p></section><section className="planner"><label>{translate("Origin")}<select value={origin} onChange={(e) => setOrigin(e.target.value)}><option value="Guwahati">{translate("Guwahati")}</option><option value="Imphal">{translate("Imphal")}</option><option value="Agartala">{translate("Agartala")}</option><option value="Gangtok">{translate("Gangtok")}</option></select></label><label>{translate("Destination")}<select value={destination} onChange={(e) => setDestination(e.target.value)}><option value="Aizawl">{translate("Aizawl")}</option><option value="Shillong">{translate("Shillong")}</option><option value="Dimapur">{translate("Dimapur")}</option><option value="Silchar">{translate("Silchar")}</option></select></label><label>{translate("Commodity")}<select><option value="Medicine">{translate("Medicine")}</option><option value="Food">{translate("Food")}</option><option value="Agricultural produce">{translate("Agricultural produce")}</option></select></label><label>{translate("Priority")}<select><option value="Emergency">{translate("Emergency")}</option><option value="High">{translate("High")}</option><option value="Normal">{translate("Normal")}</option></select></label></section><div className="route-results"><RouteResult label={translate("RECOMMENDED ROUTE")} route={recommended} incidents={incidents} primary onInspect={onSelect} />{alternate && <RouteResult label={translate("SAFER ALTERNATE")} route={alternate} incidents={incidents} onInspect={onSelect} />}</div></div> }
function RouteResult({ label, route, incidents, primary, onInspect }: { label: string; route: Route; incidents: Incident[]; primary?: boolean; onInspect: (id: string) => void }) { const risk = calculateRouteRisk(route, incidents); return <article className={`route-result ${primary ? 'primary-result' : ''}`}><div className="split"><span className="eyebrow">{label}</span><Badge value={risk.level} /></div><h2>{route.name}</h2><p>{route.origin}{translate(" → ")}{route.destination}{translate(" · ")}{route.distanceKm}{translate(" km")}</p><div className="result-stats"><span><strong>{Math.floor((route.etaMinutes + risk.delayMinutes) / 60)}{translate("h ")}{((route.etaMinutes + risk.delayMinutes) % 60)}{translate("m")}</strong>{translate("ETA")}</span><span><strong>{risk.delayMinutes}{translate(" min")}</strong>{translate("Predicted delay")}</span><span><strong>{route.accessibilityScore}{translate("%")}</strong>{translate("Accessibility")}</span><span><strong>{risk.confidence}{translate("%")}</strong>{translate("Confidence")}</span></div><h4>{translate("Why this route?")}</h4><ul>{risk.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul><p className="action-note">{risk.recommendation}</p><button className="button ghost" onClick={() => onInspect(route.id)}>{translate("INSPECT ON MAP")}</button></article> }
function EntityTable({ title, subtitle, headers, rows }: { title: string; subtitle: string; headers: string[]; rows: React.ReactNode[][] }) { return <div className="list-page"><section className="page-heading"><span className="eyebrow">{translate("COMMAND CENTER DATA")}</span><h1>{title}</h1><p>{subtitle}</p></section><section className="table-card"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></section></div> }
function AlertsPage({ alerts, onChange }: { alerts: Alert[]; onChange: (id: string, status: AlertStatus) => void }) { return <div className="list-page"><section className="page-heading"><span className="eyebrow">{translate("AUTOMATED ALERT CENTER")}</span><h1>{translate("Operational alerts")}</h1><p>{translate("Alerts are generated from simulated tracking and real incident-reaction events.")}</p></section><div className="alert-list">{alerts.map((alert) => <article className="alert-card" key={alert.id}><Badge value={alert.severity} /><div><h3>{alert.title}</h3><p>{alert.description}</p><small>{alert.location}{translate(" · ")}{alert.timestamp}</small></div><div className="alert-actions"><Badge value={alert.status} />{alert.status === 'NEW' && <button className="button ghost" onClick={() => onChange(alert.id, 'ACKNOWLEDGED')}>{translate("ACKNOWLEDGE")}</button>}{alert.status === 'ACKNOWLEDGED' && <button className="button ghost" onClick={() => onChange(alert.id, 'RESOLVED')}>{translate("RESOLVE")}</button>}</div></article>)}</div></div> }
function DistrictPage({ incidents }: { incidents: Incident[] }) { return <div className="list-page"><section className="page-heading"><span className="eyebrow">{translate("DISTRICT INTELLIGENCE")}</span><h1>{translate("Accessibility by district")}</h1><p>{translate("District conditions update as incidents are reported to the command center.")}</p></section><div className="district-grid">{districts.map((district) => <article className="district-card" key={district.id}><span>{district.state}</span><h3>{district.name}</h3><strong>{district.accessibility}{translate("%")}</strong><div className="meter"><i style={{ width: `${district.accessibility}%` }} /></div><div><Badge value={district.supplyStatus} /><small>{incidents.filter((incident) => incident.location.includes(district.name.split(' ')[0])).length}{translate(" local incidents")}</small></div></article>)}</div></div> }
function EmergencyPage({ active, onToggle, metrics, vehicles, routes }: { active: boolean; onToggle: () => void; metrics: { accessible: number; restricted: number; blocked: number; critical: number }; vehicles: Vehicle[]; routes: Route[] }) { return <div className="emergency-page"><section className="emergency-banner"><div><span className="eyebrow">{translate("PRIORITY RESPONSE MODE")}</span><h1>{active ? 'Emergency operations active' : 'Emergency operations standby'}</h1><p>{active ? 'Critical districts, corridor restrictions and essential-supply movement are prioritized.' : 'Activate only when coordinating a regional response.'}</p></div><button className={active ? 'button danger' : 'button primary'} onClick={onToggle}>{active ? 'DEACTIVATE MODE' : 'ACTIVATE EMERGENCY MODE'}</button></section><section className="metrics-grid"><Metric label={translate("Affected districts")} value={districts.filter((d) => d.accessibility < 60).length} tone="red" /><Metric label={translate("Critical incidents")} value={metrics.critical} tone="red" /><Metric label={translate("Blocked corridors")} value={metrics.blocked} tone="red" /><Metric label={translate("Medicine vehicles")} value={vehicles.filter((v) => v.commodity === 'Medicines').length} /><Metric label={translate("Safe emergency routes")} value={routes.filter((r) => r.status === 'OPEN').length} /></section><section className="priorities"><h2>{translate("Response priorities")}</h2>{routes.filter((route) => route.status !== 'OPEN').map((route) => <div key={route.id}><Badge value={route.status} /><strong>{route.name}</strong><span>{translate("Accessibility ")}{route.accessibilityScore}{translate("% · Redirect essential cargo")}</span></div>)}</section></div> }
function Settings({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) { return <div className="settings"><section className="page-heading"><span className="eyebrow">{translate("SYSTEM CONFIGURATION")}</span><h1>{translate("Settings & integrations")}</h1><p>{translate("All providers are isolated so approved services can be connected safely.")}</p></section><section className="settings-card"><h3>{translate("Google Maps Platform")}</h3><p>{translate("Configured through ")}<code>{translate("VITE_GOOGLE_MAPS_API_KEY")}</code>{translate(". Use a browser-restricted key and enable Maps JavaScript API.")}</p><h3>{translate("Data sources")}</h3><p><Badge value="DEMO" />{translate(" Deterministic weather, route, vehicle, and risk sources. No live data is claimed or sent externally.")}</p><h3>{translate("Language")}</h3><div className="toggle-row"><button className={language === 'en' ? 'button primary' : 'button ghost'} onClick={() => setLanguage('en')}>{translate("English")}</button><button className={language === 'hi' ? 'button primary' : 'button ghost'} onClick={() => setLanguage('hi')}>{translate("हिंदी")}</button></div><h3>{translate("Pending provider approvals")}</h3><p>{translate("Routing, geocoding, weather, database/authentication, photo storage and deployment remain intentionally unselected.")}</p></section></div> }

export default App
