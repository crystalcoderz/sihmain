import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = ['NEW', 'ACKNOWLEDGED', 'RESOLVED']

export async function PATCH(request: Request) {
  try {
    const { id, status } = (await request.json()) as { id?: string; status?: string }
    if (!id || !status || !STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Valid id and status required' }, { status: 400 })
    }
    await pool.query('UPDATE alerts SET status = $2 WHERE id = $1', [id, status])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert' },
      { status: 500 },
    )
  }
}
