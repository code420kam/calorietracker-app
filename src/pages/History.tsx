import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeals } from '../stores/authStore'
import type { Meal, User } from '../types'

interface Props { logout: () => void }

export default function History({ logout }: Props) {
  const navigate = useNavigate()
  const user: User = JSON.parse(localStorage.getItem('ct_user') || '{}')
  const tdee = user.tdee || 2000
  const [days, setDays] = useState<{ date: string; totals: { calories: number; carbs: number; protein: number; fat: number; fiber: number }; meals: Meal[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    setLoading(true)
    try {
      const history: typeof days = []
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const meals = await getMeals(token, dateStr)
        if (meals.length > 0) {
          const totals = meals.reduce((acc, m) => ({
            calories: acc.calories + m.calories,
            carbs: acc.carbs + m.carbs,
            protein: acc.protein + m.protein,
            fat: acc.fat + m.fat,
            fiber: acc.fiber + (m.fiber || 0),
          }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 })
          history.push({ date: dateStr, totals, meals })
        }
      }
      setDays(history)
    } catch {}
    setLoading(false)
  }

  function fmtDate(d: string) {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={() => navigate('/dashboard')}>‹</button>
        <h1>Historie</h1>
        <div style={{ width: 60 }} />
      </div>
      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Lädt...</div>
        ) : days.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">Keine Einträge</div>
            <div className="empty-desc">Deine Mahlzeiten-Historie erscheint hier.</div>
          </div>
        ) : (
          days.map(day => {
            const balance = tdee - day.totals.calories
            const isOver = balance < 0
            return (
              <div key={day.date} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtDate(day.date)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isOver ? '#EF4444' : '#00CDBB' }}>
                    {isOver ? `+${Math.abs(Math.round(day.totals.calories - tdee))} Über` : `${Math.round(day.totals.calories)} / ${tdee} kcal`}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[
                    { label: 'Eiw', value: Math.round(day.totals.protein), unit: 'g' },
                    { label: 'KH', value: Math.round(day.totals.carbs), unit: 'g' },
                    { label: 'Fett', value: Math.round(day.totals.fat), unit: 'g' },
                    { label: 'Ball', value: Math.round(day.totals.fiber * 10) / 10, unit: 'g' },
                    { label: 'kcal', value: Math.round(day.totals.calories), unit: '' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center', background: '#0B1730', borderRadius: 8, padding: '6px 4px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#00CDBB' }}>{m.value}{m.unit}</div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                {day.meals.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderTop: '1px solid #1E293B' }}>
                    <span style={{ color: '#94A3B8' }}>{m.name}</span>
                    <span style={{ color: '#64748B' }}>P:{m.protein}g K:{m.carbs}g F:{m.fat}g {m.fiber > 0 ? `Ball:${m.fiber}g` : ''}</span>
                    <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{Math.round(m.calories)} kcal</span>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </button>
        <button className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Historie
        </button>
        <button className="nav-item" onClick={() => navigate('/add')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Hinzufügen
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profil
        </button>
      </nav>
    </div>
  )
}
