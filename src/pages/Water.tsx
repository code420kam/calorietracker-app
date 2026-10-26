import React, { useState, useEffect } from 'react'
import { getWater, addWater, removeWater } from '../stores/authStore'

interface Props { token: string }

const QUICK_AMOUNTS = [250, 500, 750, 1000]

export default function Water({ token }: Props) {
  const [date] = useState(new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState<{ id: string; amount: number }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [customMl, setCustomMl] = useState('')
  const [saving, setSaving] = useState(false)
  const dailyGoal = 2500

  useEffect(() => { loadWater() }, [])

  async function loadWater() {
    setLoading(true)
    try {
      const data = await getWater(token, date)
      setEntries(data.entries)
      setTotal(data.total)
    } catch { setEntries([]); setTotal(0) }
    setLoading(false)
  }

  async function handleAdd(amount: number) {
    setSaving(true)
    try {
      const result = await addWater(token, date, amount)
      setTotal(result.total)
      await loadWater()
    } catch { /* silent */ }
    setSaving(false)
  }

  async function handleCustom(e: React.FormEvent) {
    e.preventDefault()
    const ml = parseInt(customMl)
    if (!ml || ml <= 0) return
    await handleAdd(ml)
    setCustomMl('')
  }

  async function handleDelete(id: string) {
    try {
      await removeWater(token, id)
      await loadWater()
    } catch { /* silent */ }
  }

  const pct = Math.min(100, Math.round((total / dailyGoal) * 100))
  const mlLeft = dailyGoal - total

  return (
    <div className="page">
      <div className="header-bar">
        <h1>💧 Wasser</h1>
      </div>
      <div className="page-content">
        {/* Progress Card */}
        <div className="card" style={{ background: '#0B1730', color: 'white', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>Tagesziel</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#38BDF8' }}>{(total / 1000).toFixed(1)} L <span style={{ fontSize: 18, color: '#64748B' }}>/ {(dailyGoal / 1000).toFixed(1)} L</span></div>
          <div className="progress-bar" style={{ height: 14, marginTop: 12, background: '#1E293B' }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#22C55E' : '#38BDF8' }} />
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
            {pct >= 100 ? `✓ Ziel erreicht! +${Math.round(total - dailyGoal)} ml` : `${mlLeft} ml noch bis zum Ziel`}
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10 }}>Schnell hinzufügen</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {QUICK_AMOUNTS.map(ml => (
              <button key={ml} className="btn-primary" style={{ fontSize: 14, padding: '10px 4px' }} disabled={saving}
                onClick={() => handleAdd(ml)}>
                +{ml} ml
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <form onSubmit={handleCustom} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input className="input" type="number" min="1" max="5000" placeholder="Eigene Menge (ml)" value={customMl}
            onChange={e => setCustomMl(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn-primary" disabled={saving || !customMl}>+</button>
        </form>

        {/* Today's Entries */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10 }}>Heute getrunken</div>
        {loading ? (
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
        ) : entries.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-icon">💧</div>
            <div className="empty-desc">Noch kein Wasser heute getrunken.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {entries.map(entry => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
                <span style={{ color: '#38BDF8', fontWeight: 600 }}>+{entry.amount} ml</span>
                <button className="delete-btn" onClick={() => handleDelete(entry.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
