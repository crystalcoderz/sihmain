import { NextResponse } from 'next/server'
import { pool, mapWeather } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONDITIONS: Record<string, { rain: [number, number]; wind: [number, number]; risk: [number, number] }> = {
  CLEAR: { rain: [0, 4], wind: [4, 14], risk: [10, 25] },
  RAIN: { rain: [10, 35], wind: [10, 22], risk: [30, 50] },
  'HEAVY RAIN': { rain: [45, 90], wind: [18, 34], risk: [55, 80] },
  STORM: { rain: [60, 110], wind: [30, 55], risk: [70, 95] },
  FOG: { rain: [0, 12], wind: [4, 12], risk: [35, 55] },
  SNOW: { rain: [10, 40], wind: [10, 30], risk: [45, 75] },
}
const KEYS = Object.keys(CONDITIONS)
const rand = ([a, b]: [number, number]) => Math.round(a + Math.random() * (b - a))

export async function GET() {
  const { rows } = await pool.query('SELECT * FROM weather ORDER BY district_id')
  return NextResponse.json(rows.map(mapWeather), { headers: { 'Cache-Control': 'no-store' } })
}

// Simulates a fresh sensor sweep (used until a live weather key is wired in).
export async function POST() {
  try {
    const { rows } = await pool.query('SELECT id FROM weather')
    for (const r of rows) {
      const condition = KEYS[Math.floor(Math.random() * KEYS.length)]
      const c = CONDITIONS[condition]
      await pool.query(
        `UPDATE weather SET condition=$2, temp_c=$3, rainfall_mm=$4, wind_kph=$5, risk_contribution=$6, updated_at=now() WHERE id=$1`,
        [r.id, condition, rand([14, 32]), rand(c.rain), rand(c.wind), rand(c.risk)],
      )
    }
    const updated = await pool.query('SELECT * FROM weather ORDER BY district_id')
    return NextResponse.json(updated.rows.map(mapWeather))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to refresh weather' }, { status: 500 })
  }
}
