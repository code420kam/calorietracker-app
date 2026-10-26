import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMeal, searchProducts } from '../stores/authStore'

interface Props { token: string }

const MEAL_TYPES = [
  { key: 'breakfast', label: '🍳 Frühstück' },
  { key: 'lunch', label: '🍽️ Mittag' },
  { key: 'dinner', label: '🍝 Abend' },
  { key: 'snack', label: '🍿 Snack' },
]

export default function AddMeal({ token }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'search' | 'manual'>('search')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ name: string; calories: number; carbs: number; protein: number; fat: number; brand?: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [mealType, setMealType] = useState('snack')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState({ name: '', calories: '', carbs: '', protein: '', fat: '', fiber: '', amount: '100' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    try {
      const data = await searchProducts(search)
      setResults(data)
    } catch { setResults([]) }
    setSearching(false)
  }

  function selectFood(food: typeof results[0]) {
    setForm({
      name: food.name,
      calories: String(food.calories),
      carbs: String(food.carbs),
      protein: String(food.protein),
      fat: String(food.fat),
      fiber: '',
      amount: '100',
    })
    setTab('manual')
  }

  async function handleSave() {
    setError('')
    if (!form.name || !form.calories || !date) { setError('Name und Kalorien erforderlich'); return }
    setSaving(true)
    try {
      await addMeal(token, {
        name: form.name,
        calories: parseFloat(form.calories),
        carbs: parseFloat(form.carbs) || 0,
        protein: parseFloat(form.protein) || 0,
        fat: parseFloat(form.fat) || 0,
        fiber: parseFloat(form.fiber) || 0,
        amount: parseFloat(form.amount) || 100,
        type: mealType,
        date,
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={() => navigate('/dashboard')}>‹</button>
        <h1>Mahlzeit hinzufügen</h1>
        <div style={{ width: 60 }} />
      </div>

      <div className="page-content">
        <div className="tabs">
          <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
            🔍 Lebensmittel-Suche
          </button>
          <button className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
            ✏️ Manuell
          </button>
        </div>

        {tab === 'search' && (
          <>
            <div className="search-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="search-input"
                placeholder="z.B. Banane, Haferflocken, Milch..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
              {searching ? 'Suche...' : 'Suchen'}
            </button>

            {searching && <div style={{ textAlign: 'center', padding: 20, color: '#64748B' }}>🔍 Suche läuft...</div>}
            {results.map((food, i) => (
              <div key={i} className="result-item" onClick={() => selectFood(food)}>
                <div className="result-item-info">
                  <div className="result-item-name">{food.name}</div>
                  {food.brand && <div className="result-item-brand">{food.brand}</div>}
                  <div className="result-item-macros">
                    P: {food.protein}g · K: {food.carbs}g · F: {food.fat}g
                  </div>
                </div>
                <div className="result-item-kcal">{food.calories}<br /><span style={{ fontSize: 11 }}>kcal/100g</span></div>
              </div>
            ))}
          </>
        )}

        {tab === 'manual' && (
          <>
            {error && <div className="text-error" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="card">
              <div className="card-header">Mahlzeit</div>

              <div className="input-group">
                <label>Lebensmittel</label>
                <input className="input" placeholder="z.B. Vollkornbrot" value={form.name}
                  onChange={e => update('name', e.target.value)} />
              </div>

              <div className="meal-type-row">
                {MEAL_TYPES.map(t => (
                  <button key={t.key} className={`meal-type-btn ${mealType === t.key ? 'active' : ''}`}
                    onClick={() => setMealType(t.key)}>{t.label}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Kalorien (kcal) *</label>
                  <input className="input" type="number" placeholder="0" value={form.calories}
                    onChange={e => update('calories', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Menge (g)</label>
                  <input className="input" type="number" placeholder="100" value={form.amount}
                    onChange={e => update('amount', e.target.value)} />
                </div>
              </div>

              <div className="card-header" style={{ fontSize: 15, marginTop: 8 }}>Makronährstoffe</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Protein (g)</label>
                  <input className="input" type="number" placeholder="0" value={form.protein}
                    onChange={e => update('protein', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Kohlenhydrate (g)</label>
                  <input className="input" type="number" placeholder="0" value={form.carbs}
                    onChange={e => update('carbs', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Fett (g)</label>
                  <input className="input" type="number" placeholder="0" value={form.fat}
                    onChange={e => update('fat', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Ballaststoffe (g)</label>
                  <input className="input" type="number" placeholder="0" value={form.fiber}
                    onChange={e => update('fiber', e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label>Datum</label>
                <input className="input" type="date" value={date}
                  onChange={e => setDate(e.target.value)} />
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
                {saving ? 'Speichern...' : '✓ Mahlzeit speichern'}
              </button>
            </div>
          </>
        )}
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
        <button className="nav-item active">
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
