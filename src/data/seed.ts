import type { Alert, District, Incident, Route, SupplyPoint, Vehicle } from '../domain/types'

export const districts: District[] = [
  { id: 'kamrup', name: 'Kamrup Metropolitan', state: 'Assam', accessibility: 88, supplyStatus: 'STABLE', coordinates: { lat: 26.1445, lng: 91.7362 } },
  { id: 'cachar', name: 'Cachar', state: 'Assam', accessibility: 61, supplyStatus: 'WATCH', coordinates: { lat: 24.8333, lng: 92.7789 } },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', accessibility: 52, supplyStatus: 'WATCH', coordinates: { lat: 23.7271, lng: 92.7176 } },
  { id: 'east-khasi', name: 'East Khasi Hills', state: 'Meghalaya', accessibility: 47, supplyStatus: 'CRITICAL', coordinates: { lat: 25.5788, lng: 91.8933 } },
  { id: 'imphal', name: 'Imphal West', state: 'Manipur', accessibility: 71, supplyStatus: 'STABLE', coordinates: { lat: 24.8170, lng: 93.9368 } },
  { id: 'dimapur', name: 'Dimapur', state: 'Nagaland', accessibility: 68, supplyStatus: 'WATCH', coordinates: { lat: 25.9091, lng: 93.7266 } },
  { id: 'west-tripura', name: 'West Tripura', state: 'Tripura', accessibility: 74, supplyStatus: 'STABLE', coordinates: { lat: 23.8315, lng: 91.2868 } },
  { id: 'gangtok', name: 'Gangtok', state: 'Sikkim', accessibility: 58, supplyStatus: 'WATCH', coordinates: { lat: 27.3389, lng: 88.6065 } },
  { id: 'papum-pare', name: 'Papum Pare', state: 'Arunachal Pradesh', accessibility: 55, supplyStatus: 'WATCH', coordinates: { lat: 27.0844, lng: 93.6053 } },
]

export const routes: Route[] = [
  { id: 'r1', name: 'NH-6 Guwahati–Aizawl', origin: 'Guwahati', destination: 'Aizawl', state: 'Assam / Mizoram', distanceKm: 476, etaMinutes: 780, delayMinutes: 96, status: 'RESTRICTED', accessibilityScore: 59, riskScore: 64, weatherRisk: 62, floodRisk: 42, landslideRisk: 75, trafficRisk: 49, roadConditionRisk: 60, historicalIncidentRisk: 51, path: [{ lat: 26.1445, lng: 91.7362 }, { lat: 25.1, lng: 92.5 }, { lat: 24.3, lng: 92.7 }, { lat: 23.7271, lng: 92.7176 }] },
  { id: 'r2', name: 'NH-6 Shillong Corridor', origin: 'Guwahati', destination: 'Shillong', state: 'Assam / Meghalaya', distanceKm: 101, etaMinutes: 180, delayMinutes: 130, status: 'BLOCKED', accessibilityScore: 18, riskScore: 91, weatherRisk: 80, floodRisk: 55, landslideRisk: 88, trafficRisk: 62, roadConditionRisk: 73, historicalIncidentRisk: 67, path: [{ lat: 26.1445, lng: 91.7362 }, { lat: 25.8, lng: 91.75 }, { lat: 25.5788, lng: 91.8933 }] },
  { id: 'r3', name: 'Imphal–Dimapur Lifeline', origin: 'Imphal', destination: 'Dimapur', state: 'Manipur / Nagaland', distanceKm: 215, etaMinutes: 390, delayMinutes: 42, status: 'OPEN', accessibilityScore: 78, riskScore: 35, weatherRisk: 38, floodRisk: 33, landslideRisk: 43, trafficRisk: 39, roadConditionRisk: 34, historicalIncidentRisk: 32, path: [{ lat: 24.817, lng: 93.9368 }, { lat: 25.35, lng: 93.9 }, { lat: 25.9091, lng: 93.7266 }] },
  { id: 'r4', name: 'Agartala–Silchar Supply Link', origin: 'Agartala', destination: 'Silchar', state: 'Tripura / Assam', distanceKm: 287, etaMinutes: 460, delayMinutes: 24, status: 'OPEN', accessibilityScore: 82, riskScore: 28, weatherRisk: 31, floodRisk: 45, landslideRisk: 18, trafficRisk: 32, roadConditionRisk: 29, historicalIncidentRisk: 24, path: [{ lat: 23.8315, lng: 91.2868 }, { lat: 24.4, lng: 92 }, { lat: 24.8333, lng: 92.7789 }] },
  { id: 'r5', name: 'Gangtok–Siliguri Access', origin: 'Gangtok', destination: 'Siliguri', state: 'Sikkim', distanceKm: 114, etaMinutes: 260, delayMinutes: 72, status: 'RESTRICTED', accessibilityScore: 48, riskScore: 72, weatherRisk: 66, floodRisk: 48, landslideRisk: 82, trafficRisk: 35, roadConditionRisk: 58, historicalIncidentRisk: 53, path: [{ lat: 27.3389, lng: 88.6065 }, { lat: 27.0, lng: 88.5 }, { lat: 26.73, lng: 88.4 }] },
  { id: 'r6', name: 'Itanagar–Guwahati Corridor', origin: 'Itanagar', destination: 'Guwahati', state: 'Arunachal Pradesh / Assam', distanceKm: 330, etaMinutes: 520, delayMinutes: 48, status: 'RESTRICTED', accessibilityScore: 63, riskScore: 57, weatherRisk: 56, floodRisk: 64, landslideRisk: 59, trafficRisk: 31, roadConditionRisk: 43, historicalIncidentRisk: 41, path: [{ lat: 27.0844, lng: 93.6053 }, { lat: 26.7, lng: 92.8 }, { lat: 26.1445, lng: 91.7362 }] },
]

export const incidents: Incident[] = [
  { id: 'i1', type: 'LANDSLIDE', severity: 'CRITICAL', location: 'Mawryngkneng, East Khasi Hills', coordinates: { lat: 25.557, lng: 91.91 }, description: 'Slope failure obstructing the Shillong corridor.', reporter: 'District response cell', createdAt: '2026-09-11T07:35:00.000Z', affectedRouteIds: ['r2'] },
  { id: 'i2', type: 'FLOOD', severity: 'HIGH', location: 'Sonapur, Assam', coordinates: { lat: 26.08, lng: 92.02 }, description: 'Waterlogging affecting freight lanes.', reporter: 'Field unit 04', createdAt: '2026-09-11T06:50:00.000Z', affectedRouteIds: ['r1'] },
  { id: 'i3', type: 'ROAD DAMAGE', severity: 'MEDIUM', location: 'Rangpo, Sikkim', coordinates: { lat: 27.18, lng: 88.53 }, description: 'Surface damage; single lane operational.', reporter: 'Road maintenance', createdAt: '2026-09-11T05:40:00.000Z', affectedRouteIds: ['r5'] },
]

export const vehicles: Vehicle[] = [
  { id: 'v1', vehicleId: 'AS-01-NR-4821', commodity: 'Medicines', origin: 'Guwahati', destination: 'Aizawl', coordinates: { lat: 24.8, lng: 92.68 }, speed: 31, eta: '04h 42m', status: 'AT RISK', riskLevel: 'HIGH', lastUpdated: '2 min ago', deliveryPriority: 'EMERGENCY' },
  { id: 'v2', vehicleId: 'TR-01-SN-1204', commodity: 'Food', origin: 'Agartala', destination: 'Silchar', coordinates: { lat: 24.2, lng: 91.8 }, speed: 46, eta: '03h 14m', status: 'IN TRANSIT', riskLevel: 'LOW', lastUpdated: '1 min ago', deliveryPriority: 'HIGH' },
  { id: 'v3', vehicleId: 'MN-02-SN-8820', commodity: 'Agricultural produce', origin: 'Imphal', destination: 'Dimapur', coordinates: { lat: 25.32, lng: 93.91 }, speed: 39, eta: '02h 07m', status: 'IN TRANSIT', riskLevel: 'MODERATE', lastUpdated: '3 min ago', deliveryPriority: 'NORMAL' },
  { id: 'v4', vehicleId: 'SK-01-ER-7025', commodity: 'Construction materials', origin: 'Gangtok', destination: 'Siliguri', coordinates: { lat: 27.12, lng: 88.5 }, speed: 0, eta: 'Held', status: 'DELAYED', riskLevel: 'CRITICAL', lastUpdated: '4 min ago', deliveryPriority: 'HIGH' },
]

export const supplyPoints: SupplyPoint[] = [
  { id: 's1', name: 'Guwahati Central Medical Depot', districtId: 'kamrup', commodity: 'Medicines', status: 'AVAILABLE', coordinates: { lat: 26.17, lng: 91.75 } },
  { id: 's2', name: 'Shillong Relief Store', districtId: 'east-khasi', commodity: 'Food', status: 'CRITICAL', coordinates: { lat: 25.59, lng: 91.9 } },
  { id: 's3', name: 'Aizawl Essential Supply Hub', districtId: 'aizawl', commodity: 'Medicines', status: 'LOW', coordinates: { lat: 23.74, lng: 92.72 } },
]

export const alerts: Alert[] = [
  { id: 'a1', title: 'Shillong corridor blocked', description: 'Critical landslide blocks NH-6 access near Mawryngkneng.', severity: 'CRITICAL', location: 'East Khasi Hills, Meghalaya', timestamp: '25 min ago', status: 'NEW', relatedEntity: 'r2' },
  { id: 'a2', title: 'Medicine vehicle risk elevated', description: 'AS-01-NR-4821 is approaching a restricted segment.', severity: 'HIGH', location: 'Assam / Mizoram', timestamp: '42 min ago', status: 'NEW', relatedEntity: 'v1' },
  { id: 'a3', title: 'Flood watch: Sonapur', description: 'Field report raises risk for the Guwahati–Aizawl corridor.', severity: 'HIGH', location: 'Assam', timestamp: '1h ago', status: 'ACKNOWLEDGED', relatedEntity: 'i2' },
]
