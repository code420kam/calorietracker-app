import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateGoals } from '../stores/authStore'
import type { DailyGoals } from '../types'

interface Props { token: string; logout: () => void }

export default function Profile({ token, logout }: Props) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('ct_user') || '{}')
  const [goals, setGoals] = useState<DailyGoals>({
    calories: (user.dailyGoals?.calories || 2000),
    carbs: (user.dailyGoals?.carbs || 250),
    protein: (user.dailyGoals?.protein || 100),
    fat: (user.dailyGoals?.fat || 70),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateGoals(token, goals)
      const updated = { ...user, dailyGoals: goals }
      localStorage.setItem('ct_user', JSON.stringify(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={() => navigate('/dashboard')}>‹</button>
        <h1>Profil</h1>
        <div style={{ width: 60 }} />
      </div>
      <div className="page-content">
        {/* User Info */}
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0B1730', color: '#00CDBB', fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>{user.email}</div>
        </div>

        {/* Daily Goals */}
        <form onSubmit={handleSave}>
          <div className="card">
            <div className="card-header">Tagesziele</div>
            <div className="input-group">
              <label>Kalorien (kcal)</label>
              <input className="input" type="number" value={goals.calories}
                onChange={e => setGoals(g => ({ ...g, calories: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="row-group">
              <div className="input-group">
                <label>Kohlenhydrate (g)</label>
                <input className="input" type="number" value={goals.carbs}
                  onChange={e => setGoals(g => ({ ...g, carbs: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="input-group">
                <label>Eiweiß (g)</label>
                <input className="input" type="number" value={goals.protein}
                  onChange={e => setGoals(g => ({ ...g, protein: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="input-group">
              <label>Fett (g)</label>
              <input className="input" type="number" value={goals.fat}
                onChange={e => setGoals(g => ({ ...g, fat: parseFloat(e.target.value) || 0 }))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>
              {saving ? 'Speichern...' : saved ? '✓ Gespeichert' : 'Ziele speichern'}
            </button>
          </div>
        </form>

        {/* Logout */}
        <button className="btn btn-secondary" onClick={logout} style={{ marginTop: 8 }}>
          Abmelden
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 24 }}>
          CalorieTrack v1.0<br />Made with ❤️ in Germany
        </p>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </button>
        <button className="nav-item" onClick={() => navigate('/history')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Historie
        </button>
        <button className="nav-item" onClick={() => navigate('/add')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Hinzufügen
        </button>
        <button className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profil
        </button>
      </nav>
    </div>
  )
}
