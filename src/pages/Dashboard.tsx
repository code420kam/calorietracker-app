import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeals } from '../stores/authStore'
import type { Meal, DailyGoals } from '../types'

function fmt(n: number) { return n.toFixed(1) }

function ProgressBar(current: number, goal: number, color = '#00CDBB') {
  const pct = Math.min((current / goal) * 100, 100)
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${current > goal ? 'over' : ''}`} style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function Dashboard({ token }: { token: string }) {
  const navigate = useNavigate()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(todayStr())
  const user = JSON.parse(localStorage.getItem('ct_user') || '{}')

  const goals: DailyGoals = { calories: 2000, carbs: 250, protein: 100, fat: 70 }
  const userGoals: DailyGoals = (user as { dailyGoals?: DailyGoals }).dailyGoals || goals

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    carbs: acc.carbs + m.carbs,
    protein: acc.protein + m.protein,
    fat: acc.fat + m.fat,
  }), { calories: 0, carbs: 0, protein: 0, fat: 0 })

  function changeDate(d: number) {
    const dt = new Date(date)
    dt.setDate(dt.getDate() + d)
    setDate(dt.toISOString().split('T')[0])
  }

  useEffect(() => {
    setLoading(true)
    getMeals(token, date).then(setMeals).catch(() => setMeals([])).finally(() => setLoading(false))
  }, [token, date])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Guten Morgen'
    if (h < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  const dateLabel = () => {
    const d = new Date(date + 'T00:00:00')
    const today = todayStr()
    if (date === today) return 'Heute'
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    if (date === yesterday.toISOString().split('T')[0]) return 'Gestern'
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  }

  const kpiItems = [
    { label: 'kcal', value: totals.calories, goal: userGoals.calories, unit: '' },
    { label: 'KH', value: totals.carbs, goal: userGoals.carbs, unit: 'g' },
    { label: 'Eiweiß', value: totals.protein, goal: userGoals.protein, unit: 'g' },
    { label: 'Fett', value: totals.fat, goal: userGoals.fat, unit: 'g' },
  ]

  return (
    <div className="page">
      <div className="header-bar">
        <div>
          <h1>{greeting()}, {user.name?.split(' ')[0] || '👋'}</h1>
        </div>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 20 }}>
          {(user.name || 'U').charAt(0).toUpperCase()}
        </button>
      </div>

      <div className="page-content">
        {/* Date Nav */}
        <div className="date-nav">
          <button className="date-btn" onClick={() => changeDate(-1)}>‹</button>
          <span className="date-display">{dateLabel()}</span>
          <button className="date-btn" onClick={() => changeDate(1)} disabled={date >= todayStr()}>›</button>
        </div>

        {/* KPI Grid */}
        <div className="kpi-grid">
          {kpiItems.map(item => (
            <div key={item.label} className="kpi-card">
              <div style={{ fontSize: 20, fontWeight: 800, color: item.value > item.goal && item.goal > 0 ? '#DC2626' : '#172337' }}>
                {fmt(item.value)}{item.unit}
              </div>
              {ProgressBar(item.value, item.goal)}
              <div className="kpi-label">{item.label}</div>
              <div className="kpi-sub">von {item.goal}{item.unit}</div>
            </div>
          ))}
        </div>

        {/* Recent Meals */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Mahzeiten</span>
            <button className="link-btn" onClick={() => navigate('/history')}>Alle</button>
          </div>
          {loading ? (
            <div>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />)}
            </div>
          ) : meals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <div className="empty-title">Noch keine Mahlzeiten</div>
              <div className="empty-desc">Füge heute etwas hinzu</div>
            </div>
          ) : (
            meals.slice(0, 5).map(meal => (
              <div key={meal.id} className="meal-item">
                <div className="meal-item-left">
                  <div className="meal-item-name">{meal.name}</div>
                  <div className="meal-item-meta">{meal.type === 'breakfast' ? '🍳' : meal.type === 'lunch' ? '🍽️' : meal.type === 'dinner' ? '🍝' : '🍿'} {meal.type}</div>
                </div>
                <div className="meal-item-right">
                  <div className="meal-item-cal">{Math.round(meal.calories)} kcal</div>
                  <div className="meal-item-unit">{meal.amount}g</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/add')}>+</button>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate('/dashboard')}>
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
