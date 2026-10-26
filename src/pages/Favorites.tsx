import React, { useState, useEffect } from 'react'
import { getFavorites, removeFavorite, getRecentFoods, addMeal } from '../stores/authStore'
import type { FavoriteFood, RecentFood } from '../types'

interface Props { token: string; onAddFood?: (food: { name: string; calories: number; carbs: number; protein: number; fat: number; fiber: number; amount: number }) => void }

export default function Favorites({ token, onAddFood }: Props) {
  const [tab, setTab] = useState<'favorites' | 'recent'>('favorites')
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [recent, setRecent] = useState<RecentFood[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, r] = await Promise.all([getFavorites(token), getRecentFoods(token)])
      setFavorites(f)
      setRecent(r)
      // Default amounts
      const def: Record<string, string> = {}
      ;[...f, ...r].forEach(item => { def[item.id] = String(item.amount) })
      setAmounts(def)
    } catch { /* silent */ }
    setLoading(false)
  }

  async function handleAdd(item: FavoriteFood | RecentFood) {
    const amount = parseFloat(amounts[item.id]) || item.amount
    setAddingId(item.id)
    try {
      await addMeal(token, {
        name: item.name, brand: item.brand,
        calories: Math.round(item.calories * amount / item.amount),
        carbs: Math.round(item.carbs * amount / item.amount * 10) / 10,
        protein: Math.round(item.protein * amount / item.amount * 10) / 10,
        fat: Math.round(item.fat * amount / item.amount * 10) / 10,
        fiber: Math.round(item.fiber * amount / item.amount * 10) / 10,
        amount, type: 'snack', date: new Date().toISOString().split('T')[0],
      })
      onAddFood?.({ name: item.name, calories: item.calories, carbs: item.carbs, protein: item.protein, fat: item.fat, fiber: item.fiber, amount: item.amount })
    } catch { /* silent */ }
    setAddingId(null)
  }

  async function handleRemove(id: string) {
    try { await removeFavorite(token, id); setFavorites(prev => prev.filter(f => f.id !== id)) } catch {}
  }

  const list = tab === 'favorites' ? favorites : recent
  const emptyIcon = tab === 'favorites' ? '⭐' : '🕐'
  const emptyTitle = tab === 'favorites' ? 'Keine Favoriten' : 'Keine zuletzt verwendeten Lebensmittel'
  const emptyDesc = tab === 'favorites' ? 'Füge Lebensmittel aus der Suche als Favorit hinzu.' : 'Zuletzt verwendete Lebensmittel erscheinen hier.'

  function renderItem(item: FavoriteFood | RecentFood) {
    const amount = parseFloat(amounts[item.id]) || item.amount
    const cal = Math.round(item.calories * amount / item.amount)
    const protein = Math.round(item.protein * amount / item.amount * 10) / 10
    const carbs = Math.round(item.carbs * amount / item.amount * 10) / 10
    const fat = Math.round(item.fat * amount / item.amount * 10) / 10

    return (
      <div key={item.id} style={{ padding: '14px 16px', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
            {item.brand && <div style={{ fontSize: 12, color: '#64748B' }}>{item.brand}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" className="input" min="1" max="5000"
              style={{ width: 80, fontSize: 13, padding: '6px 8px' }}
              value={amounts[item.id]} onChange={e => setAmounts(a => ({ ...a, [item.id]: e.target.value }))} />
            <span style={{ fontSize: 12, color: '#64748B', alignSelf: 'center' }}>g</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="macro-pill" style={{ fontSize: 12 }}>
            <span className="macro-pill-value">{cal} kcal</span>
            <span className="macro-pill-label"> · P: {protein}g · K: {carbs}g · F: {fat}g</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {tab === 'favorites' && (
              <button className="delete-btn" onClick={() => handleRemove(item.id)} title="Aus Favoriten entfernen">✕</button>
            )}
            <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}
              disabled={addingId === item.id} onClick={() => handleAdd(item)}>
              {addingId === item.id ? '...' : '+'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="header-bar">
        <h1>⭐ Favoriten</h1>
      </div>
      <div className="page-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['favorites', 'recent'] as const).map(t => (
            <button key={t} className={tab === t ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, fontSize: 14 }}
              onClick={() => setTab(t)}>
              {t === 'favorites' ? '⭐ Favoriten' : '🕐 Zuletzt'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{emptyIcon}</div>
            <div className="empty-title">{emptyTitle}</div>
            <div className="empty-desc">{emptyDesc}</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {list.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  )
}
