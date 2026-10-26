import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile, updateGoals } from '../stores/authStore'
import type { DailyGoals } from '../types'

interface Props { token: string; logout: () => void }

export default function Profile({ token, logout }: Props) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('ct_user') || '{}')
  const [form, setForm] = useState({
    gender: user.gender || 'male',
    age: String(user.age || 30),
    height: String(user.height || 175),
    weight: String(user.weight || 70),
    activityLevel: user.activityLevel || 'moderate',
  })
  const [goals, setGoals] = useState<DailyGoals>(user.dailyGoals || { calories: 2000, carbs: 250, protein: 100, fat: 70 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [result, setResult] = useState<{ tdee?: number; bmr?: number }>({})

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await updateProfile(token, {
        gender: form.gender,
        age: parseInt(form.age),
        height: parseInt(form.height),
        weight: parseFloat(form.weight),
        activityLevel: form.activityLevel,
      })
      setResult({ tdee: r.tdee, bmr: r.bmr })
      const updated = { ...user, ...form, age: parseInt(form.age), height: parseInt(form.height), weight: parseFloat(form.weight), tdee: r.tdee, bmr: r.bmr }
      localStorage.setItem('ct_user', JSON.stringify(updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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

        {/* TDEE Result */}
        {(result.tdee || saved) && (
          <div className="card" style={{ background: '#0B1730', color: 'white', textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Neuer Tagesbedarf</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#00CDBB' }}>{result.tdee || user.tdee} kcal</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Grundumsatz: {result.bmr || user.bmr} kcal</div>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="card">
            <div className="card-header">Körperdaten</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Geschlecht</label>
                <select className="input" value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                </select>
              </div>
              <div className="input-group">
                <label>Alter</label>
                <input className="input" type="number" value={form.age} onChange={e => update('age', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Größe (cm)</label>
                <input className="input" type="number" value={form.height} onChange={e => update('height', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Gewicht (kg)</label>
                <input className="input" type="number" step="0.1" value={form.weight} onChange={e => update('weight', e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Aktivitätslevel</label>
              <select className="input" value={form.activityLevel} onChange={e => update('activityLevel', e.target.value)}>
                <option value="sedentary">🔌 Sitzend (Büro)</option>
                <option value="light">🚶 Leicht (1-2x/Woche)</option>
                <option value="moderate">🚴 Moderat (3-4x/Woche)</option>
                <option value="active">🏃 Aktiv (5-6x/Woche)</option>
                <option value="very_active">💪 Sehr aktiv (täglich)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Berechne...' : saved ? '✓ Gespeichert!' : 'TDEE neu berechnen'}
            </button>
          </div>
        </form>

        {/* Daily Goals */}
        <form onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          try { await updateGoals(token, goals) } catch {}
          setSaving(false)
        }}>
          <div className="card">
            <div className="card-header">Makro-Ziele (Manuell)</div>
            <div className="input-group"><label>Kalorien (kcal)</label>
              <input className="input" type="number" value={goals.calories}
                onChange={e => setGoals(g => ({ ...g, calories: parseInt(e.target.value) || 0 }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group"><label>Protein (g)</label>
                <input className="input" type="number" value={goals.protein}
                  onChange={e => setGoals(g => ({ ...g, protein: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="input-group"><label>Kohlenhydrate (g)</label>
                <input className="input" type="number" value={goals.carbs}
                  onChange={e => setGoals(g => ({ ...g, carbs: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="input-group"><label>Fett (g)</label>
              <input className="input" type="number" value={goals.fat}
                onChange={e => setGoals(g => ({ ...g, fat: parseFloat(e.target.value) || 0 }))} />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={saving}>
              Makro-Ziele speichern
            </button>
          </div>
        </form>

        <button className="btn btn-danger" onClick={logout} style={{ marginTop: 8 }}>Abmelden</button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 24 }}>CalorieTrack v2.0</p>
      </div>

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
