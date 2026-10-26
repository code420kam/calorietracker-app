import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getWater, addWater, deleteMeal } from '../stores/authStore'
import type { Meal, User, Activity, WaterEntry } from '../types'
import { ACTIVITY_LABELS } from '../types'

interface Props { token: string; logout: () => void }

const MEAL_ICONS: Record<string, string> = { breakfast: '🍳', lunch: '🍽️', dinner: '🍝', snack: '🍿' }

export default function Dashboard({ token, logout }: Props) {
  const navigate = useNavigate()
  const user: User = JSON.parse(localStorage.getItem('ct_user') || '{}')
  const tdee = user.tdee || 2000
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [meals, setMeals] = useState<Meal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([])
  const [waterTotal, setWaterTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [date])

  async function loadAll() {
    setLoading(true)
    try {
      const [dash, water] = await Promise.all([
        getDashboard(token, date),
        getWater(token, date),
      ])
      setMeals(dash.meals)
      setActivities(dash.activities)
      setWaterEntries(water.entries)
      setWaterTotal(water.total)
    } catch {
      setMeals([]); setActivities([]); setWaterEntries([]); setWaterTotal(0)
    }
    setLoading(false)
  }

  async function handleDeleteMeal(id: string) {
    try { await deleteMeal(token, id); setMeals(prev => prev.filter(m => m.id !== id)) } catch {}
  }

  async function handleQuickWater(ml: number) {
    try {
      const result = await addWater(token, date, ml)
      setWaterTotal(result.total)
      const water = await getWater(token, date)
      setWaterEntries(water.entries)
    } catch {}
  }

  async function handleDeleteWater(id: string) {
    try {
      await deleteMeal(token, id)
      const water = await getWater(token, date)
      setWaterEntries(water.entries)
      setWaterTotal(water.total)
    } catch {}
  }

  const mealCalories = meals.reduce((s, m) => s + m.calories, 0)
  const activityCalories = activities.reduce((s, a) => s + (a.calories || 0), 0)
  const totalBurned = tdee + activityCalories
  const remaining = totalBurned - mealCalories
  const waterGoal = user.dailyGoals?.water || 2500
  const waterPct = Math.min(100, Math.round((waterTotal / waterGoal) * 100))

  const fmtDate = (d: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (d === today) return 'Heute'
    const dt = new Date(d + 'T00:00:00')
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
        {/* TDEE Card */}
        <div className="card" style={{ background: '#0B1730', color: 'white', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 2 }}>Tagesbedarf (TDEE)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00CDBB' }}>{tdee} kcal</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            BMR: {user.bmr || '—'} kcal · Aktivität: {user.activityLevel === 'sedentary' ? 'Sitzend' : user.activityLevel === 'light' ? 'Leicht' : user.activityLevel === 'moderate' ? 'Moderat' : user.activityLevel === 'active' ? 'Aktiv' : 'Sehr aktiv'}
          </div>
        </div>

        {/* Date Nav */}
        <div className="date-nav" style={{ marginBottom: 12 }}>
          <button className="date-btn" onClick={prevDay}>‹</button>
          <button className="date-display" onClick={today}>{fmtDate(date)}</button>
          <button className="date-btn" onClick={nextDay}>›</button>
        </div>

        {/* Calorie Breakdown */}
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>🔥 Kalorien</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: remaining < 0 ? '#EF4444' : '#00CDBB' }}>
              {Math.round(mealCalories)} / {totalBurned} kcal
            </span>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(100, Math.round((mealCalories / totalBurned) * 100))}%`,
              background: mealCalories > totalBurned ? '#EF4444' : '#00CDBB'
            }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#64748B', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>Grundbedarf: <strong style={{ color: '#94A3B8' }}>{tdee} kcal</strong>
              {activityCalories > 0 && <span> · Aktivität: <strong style={{ color: '#F97316' }}>+{activityCalories} kcal</strong></span>}
            </div>
            <div style={{ color: remaining < 0 ? '#EF4444' : '#00CDBB', fontWeight: 700 }}>
              {remaining < 0 ? `+${Math.abs(Math.round(remaining))} kcal Über` : `${Math.round(remaining)} kcal übrig`}
            </div>
          </div>
        </div>

        {/* Macro Grid */}
        <div className="kpi-grid" style={{ marginBottom: 10 }}>
          {[
            { label: 'Eiw.', value: Math.round(meals.reduce((s, m) => s + m.protein, 0)), unit: 'g', target: user.dailyGoals?.protein || 100, color: '#A78BFA' },
            { label: 'Kohlenhydr.', value: Math.round(meals.reduce((s, m) => s + m.carbs, 0)), unit: 'g', target: user.dailyGoals?.carbs || 250, color: '#FB923C' },
            { label: 'Fett', value: Math.round(meals.reduce((s, m) => s + m.fat, 0)), unit: 'g', target: user.dailyGoals?.fat || 70, color: '#FBBF24' },
            { label: 'Ballastst.', value: Math.round(meals.reduce((s, m) => s + (m.fiber || 0), 0) * 10) / 10, unit: 'g', target: 30, color: '#4ADE80' },
          ].map(m => (
            <div key={m.label} className="kpi-card">
              <div className="kpi-value" style={{ color: m.color }}>{m.value}<span style={{ fontSize: 11, fontWeight: 400 }}>{m.unit}</span></div>
              <div className="kpi-label">{m.label}</div>
              <div className="progress-bar" style={{ marginTop: 4 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Water Quick */}
        <div className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => navigate('/water')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>💧</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Wasser</span>
            </button>
            <span style={{ fontSize: 13, color: '#38BDF8', fontWeight: 700 }}>{(waterTotal / 1000).toFixed(1)} / {(waterGoal / 1000).toFixed(1)} L</span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${waterPct}%`, background: waterPct >= 100 ? '#22C55E' : '#38BDF8' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[250, 500].map(ml => (
              <button key={ml} className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '5px 0' }}
                onClick={() => handleQuickWater(ml)}>+{ml} ml</button>
            ))}
            <button className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '5px 0' }}
              onClick={() => navigate('/water')}>Mehr</button>
          </div>
        </div>

        {/* Activity Quick */}
        <div className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={() => navigate('/activities')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🏃</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Aktivität</span>
            </button>
            <span style={{ fontSize: 13, color: '#F97316', fontWeight: 700 }}>+{activityCalories} kcal</span>
          </div>
          {activities.length === 0 ? (
            <button className="btn-secondary" style={{ width: '100%', fontSize: 12, padding: '6px' }}
              onClick={() => navigate('/activities')}>+ Aktivität erfassen</button>
          ) : (
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {activities.slice(0, 2).map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ACTIVITY_LABELS[a.type as keyof typeof ACTIVITY_LABELS]}</span>
                  <span>{a.duration} min · +{a.calories} kcal</span>
                </div>
              ))}
              {activities.length > 2 && <div style={{ color: '#475569' }}>+{activities.length - 2} mehr</div>}
            </div>
          )}
        </div>

        {/* Meals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🍽️ Mahlzeiten</span>
          <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => navigate('/favorites')}>⭐ Favoriten</button>
        </div>

        {loading ? (
          <div>{[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 12 }} />)}</div>
        ) : meals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">Keine Mahlzeiten</div>
            <div className="empty-desc">Füge Mahlzeiten für diesen Tag hinzu.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, marginBottom: 80 }}>
            {meals.map(meal => (
              <div key={meal.id} className="meal-item" style={{ padding: '12px 14px' }}>
                <div className="meal-item-left">
                  <div className="meal-item-name">{MEAL_ICONS[meal.type] || '🍿'} {meal.name}</div>
                  <div className="meal-item-meta">{meal.type} · {meal.amount}g</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div className="meal-item-cal">{Math.round(meal.calories)}</div>
                    <div className="meal-item-meta">kcal</div>
                  </div>
                  <button className="delete-btn" onClick={() => handleDeleteMeal(meal.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/add')}>+</button>

      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => {}}>
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
        <button className="nav-item" onClick={() => navigate('/favorites')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Favoriten
        </button>
      </nav>
    </div>
  )
}
