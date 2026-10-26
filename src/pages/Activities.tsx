import React, { useState, useEffect } from 'react'
import { getActivities, addActivity, deleteActivity } from '../stores/authStore'
import type { Activity, ActivityType } from '../types'
import { ACTIVITY_LABELS } from '../types'

interface Props { token: string }

const TYPES: ActivityType[] = ['steps', 'walking', 'running', 'cycling', 'gym', 'other']

// Estimate calories burned per minute by activity type (rough approximation)
const CAL_PER_MIN: Record<ActivityType, number> = {
  steps: 5,    // ~300 kcal / hour
  walking: 4,  // ~240 kcal / hour
  running: 10, // ~600 kcal / hour
  cycling: 8,  // ~480 kcal / hour
  gym: 7,      // ~420 kcal / hour
  other: 5,
}

export default function Activities({ token }: Props) {
  const [date] = useState(new Date().toISOString().split('T')[0])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'running' as ActivityType, duration: '', distance: '', calories: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadActivities() }, [])

  async function loadActivities() {
    setLoading(true)
    try { setActivities(await getActivities(token, date)) } catch { setActivities([]) }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.duration) return
    setSaving(true)
    const duration = parseInt(form.duration) || 0
    const distance = parseFloat(form.distance) || 0
    // Auto-estimate calories if not provided
    let calories = parseInt(form.calories) || Math.round(duration * CAL_PER_MIN[form.type])
    try {
      const act = await addActivity(token, { type: form.type, date, duration, distance, calories })
      setActivities(prev => [...prev, act])
      setShowForm(false)
      setForm({ type: 'running', duration: '', distance: '', calories: '' })
    } catch { /* silent */ }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    try { await deleteActivity(token, id); setActivities(prev => prev.filter(a => a.id !== id)) } catch {}
  }

  const totalBurned = activities.reduce((s, a) => s + (a.calories || 0), 0)

  return (
    <div className="page">
      <div className="header-bar">
        <h1>🏃 Aktivitäten</h1>
      </div>
      <div className="page-content">
        {/* Summary Card */}
        <div className="card" style={{ background: '#0B1730', color: 'white', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>Heute verbrannt</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#F97316' }}>+{totalBurned} <span style={{ fontSize: 18, color: '#64748B' }}>kcal</span></div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{activities.length} Aktivität{activities.length !== 1 ? 'en' : ''} erfasst</div>
        </div>

        {/* Add Button */}
        <button className="btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Abbrechen' : '+ Aktivität hinzufügen'}
        </button>

        {/* Add Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 20 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#64748B', marginBottom: 6, display: 'block' }}>Aktivität</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {TYPES.map(t => (
                    <button key={t} type="button"
                      className={form.type === t ? 'btn-primary' : 'btn-secondary'}
                      style={{ fontSize: 12, padding: '8px 4px' }}
                      onClick={() => setForm(f => ({ ...f, type: t }))}>
                      {ACTIVITY_LABELS[t].split(' ')[1]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: '#64748B', marginBottom: 4, display: 'block' }}>Dauer (min) *</label>
                  <input className="input" type="number" min="1" placeholder="45" value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#64748B', marginBottom: 4, display: 'block' }}>Distanz (km)</label>
                  <input className="input" type="number" min="0" step="0.1" placeholder="6.2" value={form.distance}
                    onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#64748B', marginBottom: 4, display: 'block' }}>
                  Kalorien <span style={{ color: '#475569' }}>(Auto: ~{Math.round((parseInt(form.duration) || 0) * CAL_PER_MIN[form.type])} kcal)</span>
                </label>
                <input className="input" type="number" min="0" placeholder={`~${Math.round((parseInt(form.duration) || 30) * CAL_PER_MIN[form.type])}`}
                  value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </form>
          </div>
        )}

        {/* Activity List */}
        {loading ? (
          <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏃</div>
            <div className="empty-title">Keine Aktivitäten</div>
            <div className="empty-desc">Erfasse deine erste Aktivität für heute.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {activities.map(act => (
              <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #1E293B' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ACTIVITY_LABELS[act.type as ActivityType]}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {act.duration > 0 && `${act.duration} min`}
                    {act.distance > 0 && ` · ${act.distance} km`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#F97316', fontWeight: 700, fontSize: 15 }}>+{act.calories} kcal</span>
                  <button className="delete-btn" onClick={() => handleDelete(act.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
