import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeals, deleteMeal } from '../stores/authStore'
import type { Meal, User } from '../types'

interface Props { token: string; logout: () => void }

const MEAL_ICONS: Record<string, string> = { breakfast: '🍳', lunch: '🍽️', dinner: '🍝', snack: '🍿' }

export default function Dashboard({ token, logout }: Props) {
  const navigate = useNavigate()
  const user: User = JSON.parse(localStorage.getItem('ct_user') || '{}')
  const tdee = user.tdee || 2000
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMeals() }, [date])

  async function loadMeals() {
    setLoading(true)
    try { setMeals(await getMeals(token, date)) } catch { setMeals([]) }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    try { await deleteMeal(token, id); setMeals(prev => prev.filter(m => m.id !== id)) } catch {}
  }

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    carbs: acc.carbs + m.carbs,
    protein: acc.protein + m.protein,
    fat: acc.fat + m.fat,
    fiber: acc.fiber + (m.fiber || 0),
  }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 })

  const calBalance = tdee - totals.calories
  const calPercent = Math.min(100, Math.round((totals.calories / tdee) * 100))
  const isOver = calBalance < 0

  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    const today = new Date().toISOString().split('T')[0]
    if (d === today) return 'Heute'
    return dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  }

  function prevDay() { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]) }
  function nextDay() { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]) }
  function today() { setDate(new Date().toISOString().split('T')[0]) }

  return (
    <div className="page">
      <div className="header-bar">
        <h1>CalorieTrack</h1>
        <button className="back" onClick={logout} style={{ fontSize: 13 }}>Abmelden</button>
      </div>

      <div className="page-content">
        {/* User + TDEE Card */}
        <div className="card" style={{ background: '#0B1730', color: 'white', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 4 }}>Tagesbedarf (TDEE)</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#00CDBB' }}>{tdee} kcal</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            Grundumsatz: {user.bmr || '—'} kcal · Aktivität: {user.activityLevel === 'sedentary' ? 'Sitzend' : user.activityLevel === 'light' ? 'Leicht' : user.activityLevel === 'moderate' ? 'Moderat' : user.activityLevel === 'active' ? 'Aktiv' : 'Sehr aktiv'}
          </div>
        </div>

        {/* Date Nav */}
        <div className="date-nav">
          <button className="date-btn" onClick={prevDay}>‹</button>
          <button className="date-display" onClick={today}>{fmtDate(date)}</button>
          <button className="date-btn" onClick={nextDay}>›</button>
        </div>

        {/* Calorie Progress */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Kalorien</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: isOver ? '#EF4444' : '#00CDBB' }}>
              {Math.round(totals.calories)} / {tdee} kcal
            </span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div className="progress-fill" style={{
              width: `${calPercent}%`,
              background: isOver ? '#EF4444' : calPercent > 80 ? '#F59E0B' : '#00CDBB'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#64748B' }}>
            <span>{calPercent}% verbraucht</span>
            <span style={{ color: isOver ? '#EF4444' : '#00CDBB', fontWeight: 700 }}>
              {isOver ? `+${Math.abs(Math.round(calBalance))} kcal Über` : `${Math.round(calBalance)} kcal übrig`}
            </span>
          </div>
        </div>

        {/* Macro Grid */}
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          {[
            { label: 'Eiw.', value: Math.round(totals.protein), unit: 'g', target: user.dailyGoals?.protein || 100 },
            { label: 'Kohlenhydr.', value: Math.round(totals.carbs), unit: 'g', target: user.dailyGoals?.carbs || 250 },
            { label: 'Fett', value: Math.round(totals.fat), unit: 'g', target: user.dailyGoals?.fat || 70 },
            { label: 'Ballastst.', value: Math.round(totals.fiber * 10) / 10, unit: 'g', target: 30 },
          ].map(m => (
            <div key={m.label} className="kpi-card">
              <div className="kpi-value">{m.value}<span style={{ fontSize: 11, fontWeight: 400 }}>{m.unit}</span></div>
              <div className="kpi-label">{m.label}</div>
              <div className="progress-bar" style={{ marginTop: 4 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Meals */}
        {loading ? (
          <div>{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 12 }} />)}</div>
        ) : meals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">Keine Mahlzeiten</div>
            <div className="empty-desc">Füge Mahlzeiten für diesen Tag hinzu.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {meals.map(meal => (
              <div key={meal.id} className="meal-item" style={{ padding: '14px 16px' }}>
                <div className="meal-item-left">
                  <div className="meal-item-name">{MEAL_ICONS[meal.type] || '🍿'} {meal.name}</div>
                  <div className="meal-item-meta">
                    {meal.type} · {meal.amount}g
                    {meal.fiber > 0 && <span> · Ball: {meal.fiber}g</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div className="meal-item-cal">{Math.round(meal.calories)}</div>
                    <div className="meal-item-meta">kcal · P: {meal.protein}g · K: {meal.carbs}g · F: {meal.fat}g</div>
                  </div>
                  <button className="delete-btn" onClick={() => handleDelete(meal.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/add')}>+</button>

      <nav className="bottom-nav">
        <button className="nav-item active">
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
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profil
        </button>
      </nav>
    </div>
  )
}
