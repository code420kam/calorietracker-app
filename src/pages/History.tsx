import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeals, deleteMeal } from '../stores/authStore'
import type { Meal } from '../types'

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (d === today) return 'Heute'
  if (d === yesterday.toISOString().split('T')[0]) return 'Gestern'
  return dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default function History({ token }: { token: string }) {
  const navigate = useNavigate()
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeek()
  }, [token])

  async function loadWeek() {
    setLoading(true)
    try {
      const days = 7
      const meals: Meal[] = []
      for (let i = 0; i < days; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const dayMeals = await getMeals(token, dateStr)
        meals.push(...dayMeals)
      }
      setAllMeals(meals)
    } catch { setAllMeals([]) }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    try {
      await deleteMeal(token, id)
      setAllMeals(prev => prev.filter(m => m.id !== id))
    } catch {}
  }

  // Group by date
  const grouped: Record<string, Meal[]> = {}
  allMeals.forEach(m => {
    if (!grouped[m.date]) grouped[m.date] = []
    grouped[m.date].push(m)
  })

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={() => navigate('/dashboard')}>‹</button>
        <h1>Historie</h1>
        <div style={{ width: 60 }} />
      </div>
      <div className="page-content">
        {loading ? (
          <div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 12 }} />
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-icon">📅</div>
            <div className="empty-title">Keine Einträge</div>
            <div className="empty-desc">Deine Mahlzeiten werden hier angezeigt.</div>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {fmtDate(date)}
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {grouped[date].map(meal => (
                  <div key={meal.id} className="meal-item" style={{ padding: '14px 16px' }}>
                    <div className="meal-item-left">
                      <div className="meal-item-name">{meal.name}</div>
                      <div className="meal-item-meta">
                        {meal.type === 'breakfast' ? '🍳' : meal.type === 'lunch' ? '🍽️' : meal.type === 'dinner' ? '🍝' : '🍿'}{' '}
                        {meal.type} · {meal.amount}g
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="meal-item-right">
                        <div className="meal-item-cal">{Math.round(meal.calories)} kcal</div>
                      </div>
                      <button className="delete-btn" onClick={() => handleDelete(meal.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Nav */}
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
