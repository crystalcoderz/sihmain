import { useState } from 'react'
import type { District, WeatherReading } from '../domain/types'
import { relativeTime } from './ui'

interface Props {
  weather: WeatherReading[]
  districts: District[]
  onMutate: () => void
}

const ICON: Record<string, string> = { CLEAR: '○', RAIN: '≈', 'HEAVY RAIN': '≋', STORM: '⚡', FOG: '░', SNOW: '❄' }

const riskBand = (v: number) => (v >= 70 ? 'critical' : v >= 50 ? 'high' : v >= 30 ? 'moderate' : 'low')

export function Weather({ weather, districts, onMutate }: Props) {
  const [busy, setBusy] = useState(false)
  const districtName = (id: string) => districts.find((d) => d.id === id)?.name ?? id
  const sorted = [...weather].sort((a, b) => b.riskContribution - a.riskContribution)
  const highest = sorted[0]

  async function refresh() {
    setBusy(true)
    try {
      await fetch('/api/weather', { method: 'POST' })
      onMutate()
    } finally { setBusy(false) }
  }

  return (
    <div className="list-page">
      <div className="page-heading dashboard-title">
        <div>
          <span className="eyebrow">METEOROLOGICAL FEED</span>
          <h1>Weather &amp; <em>risk</em> feed</h1>
          <p>District-level meteorological readings feeding the corridor risk engine. Refresh runs a sensor sweep — wire a live weather API key later to replace the simulation.</p>
        </div>
        <button className="button primary" onClick={refresh} disabled={busy}>{busy ? 'Sweeping…' : '↻ Refresh feed'}</button>
      </div>

      {highest && (
        <div className="command-strip">
          <div className="readiness">
            <span>HIGHEST WEATHER RISK</span>
            <strong>{highest.riskContribution}<small>/100</small></strong>
            <div className="readiness-track"><i style={{ width: `${highest.riskContribution}%` }} /></div>
          </div>
          <div className="strip-message">
            <span className="eyebrow">{ICON[highest.condition]} {highest.condition}</span>
            <strong>{districtName(highest.districtId)}</strong>
            <p>{highest.rainfallMm} mm rainfall · {highest.windKph} kph winds · {highest.tempC}°C. Corridors through this district carry elevated weather load.</p>
          </div>
          <div className="strip-action">
            <span>UPDATED</span>
            <strong style={{ fontSize: 20 }}>{relativeTime(highest.updatedAt)}</strong>
            <small>{weather.length} stations</small>
          </div>
        </div>
      )}

      <div className="weather-grid">
        {sorted.map((w) => (
          <div key={w.id} className={`weather-card ${riskBand(w.riskContribution)}`}>
            <div className="weather-top">
              <div><span className="wx-icon">{ICON[w.condition]}</span><strong>{districtName(w.districtId)}</strong><small className="muted">{w.condition}</small></div>
              <span className="wx-temp">{w.tempC}°</span>
            </div>
            <div className="weather-stats">
              <div><strong>{w.rainfallMm}<small>mm</small></strong><span>Rainfall</span></div>
              <div><strong>{w.windKph}<small>kph</small></strong><span>Wind</span></div>
              <div><strong>{w.riskContribution}</strong><span>Risk load</span></div>
            </div>
            <div className="meter"><i style={{ width: `${w.riskContribution}%`, background: w.riskContribution >= 60 ? '#dd5252' : w.riskContribution >= 40 ? '#de9a26' : '#20a47f' }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
