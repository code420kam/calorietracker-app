import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProducts, addMeal } from '../stores/authStore'

interface FoodItem { name: string; calories: number; carbs: number; protein: number; fat: number; brand?: string }

export default function AddMeal({ token }: { token: string }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'search' | 'manual'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)

  // Manual form
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [carbs, setCarbs] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [amount, setAmount] = useState('100')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const mealTypes = [
    { key: 'breakfast', label: '🍳 Frühstück' },
    { key: 'lunch', label: '🍽️ Mittag' },
    { key: 'dinner', label: '🍝 Abend' },
    { key: 'snack', label: '🍿 Snack' },
  ] as const

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchProducts(query)
        setResults(data)
      } catch { setResults([]) }
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  async function handleAdd(item: FoodItem) {
    setSaving(true)
    setError('')
    try {
      await addMeal(token, {
        userId: '',
        name: item.name,
        calories: item.calories,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        amount: parseFloat(amount) || 100,
        type: mealType,
        date: new Date().toISOString().split('T')[0],
      })
      navigate('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Bitte gib einen Namen ein'); return }
    setSaving(true)
    setError('')
    try {
      await addMeal(token, {
        userId: '',
        name: name.trim(),
        calories: parseFloat(calories) || 0,
        carbs: parseFloat(carbs) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        amount: parseFloat(amount) || 100,
        type: mealType,
        date: new Date().toISOString().split('T')[0],
      })
      navigate('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={() => navigate('/dashboard')}>‹ Zurück</button>
        <h1>Mahlzeit hinzufügen</h1>
        <div style={{ width: 60 }} />
      </div>

      <div className="page-content">
        {/* Meal Type */}
        <div className="meal-type-row">
          {mealTypes.map(t => (
            <button key={t.key} className={`meal-type-btn ${mealType === t.key ? 'active' : ''}`}
              onClick={() => setMealType(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>🔍 Suchen</button>
          <button className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>✏️ Manuell</button>
        </div>

        {tab === 'search' ? (
          <div>
            <div className="search-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Produkt suchen (z.B. Milch, Brot, Apfel...)"
                value={query} onChange={e => setQuery(e.target.value)} autoFocus />
            </div>
            {searching && <div style={{ textAlign: 'center', color: '#64748B', padding: 16 }}>Suche läuft...</div>}
            {results.map((item, i) => (
              <div key={i} className="result-item" onClick={() => handleAdd(item)}>
                <div className="result-item-info">
                  <div className="result-item-name">{item.name}</div>
                  {item.brand && <div className="result-item-brand">{item.brand}</div>}
                  <div className="result-item-macros">
                    KH: {item.carbs}g · EW: {item.protein}g · F: {item.fat}g · je 100g
                  </div>
                </div>
                <div>
                  <div className="result-item-kcal">{item.calories} kcal</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>pro 100g</div>
                </div>
              </div>
            ))}
            {!searching && query && results.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">Keine Ergebnisse</div>
                <div className="empty-desc">Versuche einen anderen Suchbegriff oder nutze die manuelle Eingabe.</div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManual}>
            <div className="input-group">
              <label className="input-group label">Produktname</label>
              <input className="input" placeholder="z.B. Vollkornbrot" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="row-group">
              <div className="input-group">
                <label className="input-group label">Kalorien (kcal)</label>
                <input className="input" type="number" inputMode="decimal" placeholder="0" value={calories} onChange={e => setCalories(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-group label">Menge (g)</label>
                <input className="input" type="number" inputMode="decimal" placeholder="100" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
            <div className="row-group">
              <div className="input-group">
                <label className="input-group label">KH (g)</label>
                <input className="input" type="number" inputMode="decimal" placeholder="0" value={carbs} onChange={e => setCarbs(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-group label">Eiweiß (g)</label>
                <input className="input" type="number" inputMode="decimal" placeholder="0" value={protein} onChange={e => setProtein(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-group label">Fett (g)</label>
              <input className="input" type="number" inputMode="decimal" placeholder="0" value={fat} onChange={e => setFat(e.target.value)} />
            </div>
            {error && <p className="text-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 16 }}>
              {saving ? 'Wird gespeichert...' : 'Mahlzeit speichern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
