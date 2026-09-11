import type { Incident, RiskAssessment, RiskLevel, Route } from './types'

const levelFor = (score: number): RiskLevel => score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 30 ? 'MODERATE' : 'LOW'

export function calculateRouteRisk(route: Route, incidents: Incident[] = []): RiskAssessment {
  const impact = incidents.filter((incident) => route.id in Object.fromEntries(incident.affectedRouteIds.map((id) => [id, true])))
  const incidentRisk = Math.min(100, route.historicalIncidentRisk + impact.reduce((sum, incident) => sum + ({ LOW: 5, MEDIUM: 12, HIGH: 22, CRITICAL: 35 }[incident.severity]), 0))
  const raw = route.weatherRisk * .18 + route.floodRisk * .18 + route.landslideRisk * .24 + route.trafficRisk * .12 + route.roadConditionRisk * .18 + incidentRisk * .1
  const score = Math.round(Math.min(100, raw))
  const factors = [
    route.landslideRisk >= 55 && `Landslide exposure is ${route.landslideRisk}/100`,
    route.weatherRisk >= 50 && `Weather exposure is ${route.weatherRisk}/100`,
    route.roadConditionRisk >= 50 && `Road condition risk is ${route.roadConditionRisk}/100`,
    impact.length > 0 && `${impact.length} field incident${impact.length > 1 ? 's' : ''} affects this corridor`,
  ].filter(Boolean) as string[]
  return { score, level: levelFor(score), confidence: Math.min(94, 70 + route.historicalIncidentRisk / 4 + impact.length * 3), delayMinutes: Math.round(route.delayMinutes + score * .42), factors: factors.length ? factors : ['Current weather and road conditions remain within operating thresholds'], recommendation: score >= 75 ? 'Hold non-essential movement and dispatch through an alternate corridor.' : score >= 55 ? 'Prioritize essential supplies and monitor before dispatch.' : 'Route remains usable; continue normal monitoring.' }
}

export function applyIncidentToRoute(route: Route, incident: Incident): Route {
  if (!incident.affectedRouteIds.includes(route.id)) return route
  const severityImpact = { LOW: 8, MEDIUM: 18, HIGH: 35, CRITICAL: 58 }[incident.severity]
  const severe = incident.severity === 'CRITICAL' || incident.type === 'BRIDGE DAMAGE'
  return { ...route, status: severe ? 'BLOCKED' : incident.severity === 'HIGH' ? 'RESTRICTED' : route.status, accessibilityScore: Math.max(0, route.accessibilityScore - severityImpact), riskScore: Math.min(100, route.riskScore + severityImpact), delayMinutes: route.delayMinutes + severityImpact * 2, landslideRisk: incident.type === 'LANDSLIDE' ? Math.min(100, route.landslideRisk + severityImpact) : route.landslideRisk, floodRisk: incident.type === 'FLOOD' ? Math.min(100, route.floodRisk + severityImpact) : route.floodRisk }
}
