import { Pool } from 'pg'
import type { Alert, District, Incident, Route, SupplyPoint, Vehicle } from '@/src/domain/types'

const globalForPool = globalThis as unknown as { nerPool?: Pool }
export const pool =
  globalForPool.nerPool ?? new Pool({ connectionString: process.env.DATABASE_URL })
if (process.env.NODE_ENV !== 'production') globalForPool.nerPool = pool

export interface ConsoleState {
  districts: District[]
  routes: Route[]
  incidents: Incident[]
  vehicles: Vehicle[]
  supplyPoints: SupplyPoint[]
  alerts: Alert[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const mapDistrict = (r: any): District => ({
  id: r.id, name: r.name, state: r.state, accessibility: r.accessibility,
  supplyStatus: r.supply_status, coordinates: { lat: r.lat, lng: r.lng },
})

export const mapRoute = (r: any): Route => ({
  id: r.id, name: r.name, origin: r.origin, destination: r.destination, state: r.state,
  distanceKm: r.distance_km, etaMinutes: r.eta_minutes, delayMinutes: r.delay_minutes,
  status: r.status, accessibilityScore: r.accessibility_score, riskScore: r.risk_score,
  weatherRisk: r.weather_risk, floodRisk: r.flood_risk, landslideRisk: r.landslide_risk,
  trafficRisk: r.traffic_risk, roadConditionRisk: r.road_condition_risk,
  historicalIncidentRisk: r.historical_incident_risk,
  path: typeof r.path === 'string' ? JSON.parse(r.path) : r.path,
})

export const mapIncident = (r: any): Incident => ({
  id: r.id, type: r.type, severity: r.severity, location: r.location,
  coordinates: { lat: r.lat, lng: r.lng }, description: r.description, reporter: r.reporter,
  createdAt: new Date(r.created_at).toISOString(),
  affectedRouteIds: typeof r.affected_route_ids === 'string' ? JSON.parse(r.affected_route_ids) : r.affected_route_ids,
  syncStatus: r.sync_status ?? undefined,
})

export const mapVehicle = (r: any): Vehicle => ({
  id: r.id, vehicleId: r.vehicle_id, commodity: r.commodity, origin: r.origin,
  destination: r.destination, coordinates: { lat: r.lat, lng: r.lng }, speed: r.speed,
  eta: r.eta, status: r.status, riskLevel: r.risk_level, lastUpdated: r.last_updated,
  deliveryPriority: r.delivery_priority,
})

export const mapSupplyPoint = (r: any): SupplyPoint => ({
  id: r.id, name: r.name, districtId: r.district_id, commodity: r.commodity,
  status: r.status, coordinates: { lat: r.lat, lng: r.lng },
})

export const mapAlert = (r: any): Alert => ({
  id: r.id, title: r.title, description: r.description, severity: r.severity,
  location: r.location, timestamp: r.timestamp, status: r.status, relatedEntity: r.related_entity,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getState(): Promise<ConsoleState> {
  const [districts, routes, incidents, vehicles, supplyPoints, alerts] = await Promise.all([
    pool.query('SELECT * FROM districts ORDER BY name'),
    pool.query('SELECT * FROM routes ORDER BY id'),
    pool.query('SELECT * FROM incidents ORDER BY created_at DESC'),
    pool.query('SELECT * FROM vehicles ORDER BY id'),
    pool.query('SELECT * FROM supply_points ORDER BY id'),
    pool.query('SELECT * FROM alerts ORDER BY created_at DESC'),
  ])
  return {
    districts: districts.rows.map(mapDistrict),
    routes: routes.rows.map(mapRoute),
    incidents: incidents.rows.map(mapIncident),
    vehicles: vehicles.rows.map(mapVehicle),
    supplyPoints: supplyPoints.rows.map(mapSupplyPoint),
    alerts: alerts.rows.map(mapAlert),
  }
}
