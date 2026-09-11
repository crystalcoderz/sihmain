import { useMemo, useState } from 'react'
import type { District, InventoryItem, InventoryCategory } from '../domain/types'
import { relativeTime } from './ui'

interface Props {
  inventory: InventoryItem[]
  districts: District[]
  onMutate: () => void
}

const CATEGORIES: InventoryCategory[] = ['Medicines', 'Food', 'Water', 'Shelter', 'Fuel']

export function Inventory({ inventory, districts, onMutate }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [category, setCategory] = useState<'ALL' | InventoryCategory>('ALL')
  const [form, setForm] = useState({ name: '', category: 'Food' as InventoryCategory, districtId: districts[0]?.id ?? '', quantity: '', unit: 'packs', threshold: '' })
  const [message, setMessage] = useState('')

  const districtName = (id: string) => districts.find((d) => d.id === id)?.name ?? id
  const filtered = useMemo(() => (category === 'ALL' ? inventory : inventory.filter((i) => i.category === category)), [inventory, category])
  const lowStock = inventory.filter((i) => i.quantity < i.threshold)

  async function adjust(id: string, delta: number) {
    setBusy(id)
    try {
      await fetch('/api/inventory', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, delta }) })
      onMutate()
    } finally { setBusy(null) }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.districtId) { setMessage('Name and district are required.'); return }
    setBusy('new')
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, category: form.category, districtId: form.districtId, quantity: Number(form.quantity), unit: form.unit, threshold: Number(form.threshold) }),
      })
      if (!res.ok) throw new Error('failed')
      setForm({ ...form, name: '', quantity: '', threshold: '' })
      setMessage('Stock item added to the relief ledger.')
      onMutate()
    } catch { setMessage('Could not add item. Try again.') } finally { setBusy(null) }
  }

  return (
    <div className="list-page">
      <div className="page-heading">
        <span className="eyebrow">RELIEF LOGISTICS</span>
        <h1>Relief <em>inventory</em> ledger</h1>
        <p>Stock positions for medicine, food, water, shelter and fuel across district warehouses. Items below their reorder threshold are flagged for replenishment.</p>
      </div>

      {lowStock.length > 0 && (
        <div className="lowstock-banner">
          <strong>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} below threshold</strong>
          <span>{lowStock.map((i) => i.name).join(' · ')}</span>
        </div>
      )}

      <div className="inventory-layout">
        <div className="table-card">
          <div className="inv-filter">
            <button className={category === 'ALL' ? 'active' : ''} onClick={() => setCategory('ALL')}>All</button>
            {CATEGORIES.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
          <table>
            <thead><tr><th>Item</th><th>Category</th><th>District</th><th>On hand</th><th>Status</th><th>Adjust</th></tr></thead>
            <tbody>
              {filtered.map((i) => {
                const low = i.quantity < i.threshold
                const pct = Math.min(100, Math.round((i.quantity / Math.max(1, i.threshold)) * 100))
                return (
                  <tr key={i.id}>
                    <td><strong style={{ color: '#e5f2fb' }}>{i.name}</strong><br /><small className="muted">updated {relativeTime(i.updatedAt)}</small></td>
                    <td>{i.category}</td>
                    <td>{districtName(i.districtId)}</td>
                    <td>{i.quantity.toLocaleString()} {i.unit}<div className="meter" style={{ marginTop: 6 }}><i style={{ width: `${pct}%`, background: low ? '#dd5252' : '#20a47f' }} /></div></td>
                    <td><span className={`badge ${low ? 'high' : 'low'}`}>{low ? 'REORDER' : 'STABLE'}</span></td>
                    <td>
                      <div className="inv-adjust">
                        <button disabled={busy === i.id} onClick={() => adjust(i.id, -25)} aria-label={`Reduce ${i.name}`}>−25</button>
                        <button disabled={busy === i.id} onClick={() => adjust(i.id, 25)} aria-label={`Add to ${i.name}`}>+25</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <form className="field-card" onSubmit={addItem}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: '#eff8ff' }}>Add stock item</h3>
          <p className="muted" style={{ fontSize: 11, margin: '0 0 16px' }}>Register a new relief commodity in a district warehouse.</p>
          <div className="form-grid">
            <label className="wide">Item name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chlorine tablets" /></label>
            <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>District<select value={form.districtId} onChange={(e) => setForm({ ...form, districtId: e.target.value })}>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label>Quantity<input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
            <label>Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
            <label className="wide">Reorder threshold<input type="number" min={0} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <span className="form-message">{message}</span>
            <button className="button primary" disabled={busy === 'new'}>{busy === 'new' ? 'Saving…' : 'Add to ledger'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
