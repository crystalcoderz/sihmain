export type RouteStatus = 'OPEN' | 'RESTRICTED' | 'BLOCKED'
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type IncidentType = 'LANDSLIDE' | 'FLOOD' | 'ROAD DAMAGE' | 'BRIDGE DAMAGE' | 'TRAFFIC' | 'SEVERE WEATHER' | 'OTHER'
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type VehicleStatus = 'IN TRANSIT' | 'DELAYED' | 'AT RISK' | 'DELIVERED' | 'EMERGENCY'
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'
export type SyncStatus = 'DRAFT' | 'QUEUED_OFFLINE' | 'SYNCING' | 'SYNCED' | 'FAILED'

export interface Coordinates { lat: number; lng: number }
export interface District { id: string; name: string; state: string; accessibility: number; supplyStatus: 'STABLE' | 'WATCH' | 'CRITICAL'; coordinates: Coordinates }
export interface Route {
  id: string; name: string; origin: string; destination: string; state: string; distanceKm: number; etaMinutes: number; delayMinutes: number
  status: RouteStatus; accessibilityScore: number; riskScore: number; weatherRisk: number; floodRisk: number; landslideRisk: number; trafficRisk: number; roadConditionRisk: number; historicalIncidentRisk: number; path: Coordinates[]
}
export interface Incident { id: string; type: IncidentType; severity: IncidentSeverity; location: string; coordinates: Coordinates; description: string; reporter: string; createdAt: string; affectedRouteIds: string[]; syncStatus?: SyncStatus }
export interface Vehicle { id: string; vehicleId: string; commodity: 'Medicines' | 'Food' | 'Agricultural produce' | 'Construction materials'; origin: string; destination: string; coordinates: Coordinates; speed: number; eta: string; status: VehicleStatus; riskLevel: RiskLevel; lastUpdated: string; deliveryPriority: 'NORMAL' | 'HIGH' | 'EMERGENCY' }
export interface SupplyPoint { id: string; name: string; districtId: string; commodity: string; status: 'AVAILABLE' | 'LOW' | 'CRITICAL'; coordinates: Coordinates }
export interface Alert { id: string; title: string; description: string; severity: RiskLevel; location: string; timestamp: string; status: AlertStatus; relatedEntity: string }
export interface FieldReportDraft { localReportId: string; incidentType: IncidentType; severity: IncidentSeverity; latitude: number; longitude: number; location: string; description: string; reporter: string; createdAt: string; syncStatus: SyncStatus; retryCount: number; lastSyncAttempt?: string; serverId?: string }
export interface RiskAssessment { score: number; level: RiskLevel; confidence: number; delayMinutes: number; factors: string[]; recommendation: string }
