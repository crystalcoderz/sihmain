import { Loader } from '@googlemaps/js-api-loader'
import type { Incident, Route, SupplyPoint, Vehicle } from '../domain/types'

export interface MapProvider { render(element: HTMLElement, data: { routes: Route[]; incidents: Incident[]; vehicles: Vehicle[]; supplyPoints: SupplyPoint[]; theme?: 'dark' | 'light' }): Promise<void>; destroy(): void }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] ?? character))

export class GoogleMapProvider implements MapProvider {
  private map?: google.maps.Map
  private overlays: google.maps.MVCObject[] = []
  async render(element: HTMLElement, data: { routes: Route[]; incidents: Incident[]; vehicles: Vehicle[]; supplyPoints: SupplyPoint[] }) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) throw new Error('Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Project Settings and reload.')
    const google = await new Loader({ apiKey: key, version: 'weekly' }).load()
    this.destroy()
    const darkStyles = [
      { elementType: 'geometry', stylers: [{ color: '#171717' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8d8d8d' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#171717' }] },
      { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#303030' }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#161616' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1f1f1f' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#676767' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#101010' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#242424' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080808' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4f4f4f' }] },
    ]
    const lightStyles = [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#eef1f4' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe3ef' }] },
    ]
    this.map = new google.maps.Map(element, { center: { lat: 25.8, lng: 92.7 }, zoom: 6, mapTypeId: 'roadmap', disableDefaultUI: true, zoomControl: true, styles: data.theme === 'light' ? lightStyles : darkStyles })
    const info = new google.maps.InfoWindow()
    data.routes.forEach((route) => {
      const color = route.status === 'BLOCKED' ? '#e14a4a' : route.status === 'RESTRICTED' ? '#e9a234' : '#24a780'
      const polyline = new google.maps.Polyline({ path: route.path, map: this.map, strokeColor: color, strokeOpacity: .9, strokeWeight: 5 })
      polyline.addListener('click', (event: google.maps.MapMouseEvent) => { info.setContent(`<strong>${route.name}</strong><br>Accessibility: ${route.accessibilityScore}% · Risk: ${route.riskScore}/100<br>Status: ${route.status}`); info.setPosition(event.latLng ?? route.path[0]); info.open(this.map) })
      this.overlays.push(polyline)
    })
    data.incidents.forEach((incident) => { const marker = new google.maps.Marker({ position: incident.coordinates, map: this.map, title: `${incident.severity}: ${incident.type}`, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#e14a4a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 8 } }); marker.addListener('click', () => { info.setContent(`<strong>${escapeHtml(incident.type)}</strong><br>${escapeHtml(incident.location)}<br>${escapeHtml(incident.description)}`); info.open(this.map, marker) }); this.overlays.push(marker) })
    data.vehicles.forEach((vehicle) => { const marker = new google.maps.Marker({ position: vehicle.coordinates, map: this.map, title: vehicle.vehicleId, label: { text: '▰', color: '#153162', fontSize: '18px' } }); marker.addListener('click', () => { info.setContent(`<strong>${vehicle.vehicleId}</strong><br>${vehicle.commodity} · ${vehicle.status}<br>ETA: ${vehicle.eta}`); info.open(this.map, marker) }); this.overlays.push(marker) })
    data.supplyPoints.forEach((supply) => { const marker = new google.maps.Marker({ position: supply.coordinates, map: this.map, title: supply.name, label: { text: '+', color: '#fff', fontWeight: 'bold' }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#1d76a9', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 9 } }); this.overlays.push(marker) })
  }
  destroy() { this.overlays.forEach((overlay) => overlay.set('map', null)); this.overlays = []; this.map = undefined }
}
