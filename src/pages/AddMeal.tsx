import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { addMeal, searchProducts, addFavorite } from '../stores/authStore'

interface Props { token: string }

const MEAL_TYPES = [
  { key: 'breakfast', label: '🍳 Frühstück' },
  { key: 'lunch', label: '🍽️ Mittag' },
  { key: 'dinner', label: '🍝 Abend' },
  { key: 'snack', label: '🍿 Snack' },
]

// Vollständige Nährwerte pro 100g – für die Suche
interface FoodPer100g {
  name: string
  brand?: string
  calories: number
  carbs: number
  sugar?: number
  fat: number
  saturatedFat?: number
  protein: number
  fiber?: number
  salt?: number
  sodium?: number
}

export default function AddMeal({ token }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'search' | 'manual' | 'scan' | 'photo'>('search')
  const [photoAddedItems, setPhotoAddedItems] = useState<FoodPer100g[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<FoodPer100g[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [mealType, setMealType] = useState('snack')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // ---- Manuell: Formular-Felder ----
  const [form, setForm] = useState({
    name: '', calories: '', carbs: '', protein: '', fat: '', fiber: '', amount: '100',
  })

  // ---- Such-Lebensmittel: per-100g-Daten + aktuelle Menge ----
  const [selectedFood, setSelectedFood] = useState<FoodPer100g | null>(null)
  const [searchAmount, setSearchAmount] = useState('100')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Schließen des Dropdowns bei Klick außerhalb
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Prefill von Barcode-Scan, Suche-Ergebnis oder PhotoAI
  useEffect(() => {
    const state = location.state as { prefill?: FoodPer100g } | null
    if (state?.prefill) {
      const f = state.prefill
      setSelectedFood(f)
      setForm({ name: f.name, calories: String(f.calories), carbs: String(f.carbs), protein: String(f.protein), fat: String(f.fat), fiber: String(f.fiber ?? ''), amount: '100' })
      setSearchAmount('100')
      setTab('search')
      navigate(location.pathname, { replace: true })
    }
    // PhotoAI: ?photoItems=...
    const photoItemsParam = searchParams.get('photoItems')
    if (photoItemsParam) {
      try {
        const items = JSON.parse(decodeURIComponent(photoItemsParam)) as { name: string; calories: number; carbs: number; protein: number; fat: number; fiber: number; amount: number }[]
        setPhotoAddedItems(items.map(i => ({ name: i.name, calories: i.calories, carbs: i.carbs, protein: i.protein, fat: i.fat, fiber: i.fiber ?? 0 })))
        setTab('photo')
      } catch {}
    }
  }, [location.state, navigate, location.pathname, searchParams])

  // ---- Autovervollständigung: debounced Suche ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setShowDropdown(true)
      try {
        const data = await searchProducts(search)
        setResults(data)
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  function selectFood(food: FoodPer100g) {
    setSelectedFood(food)
    setForm({
      name: food.name,
      calories: String(food.calories),
      carbs: String(food.carbs),
      protein: String(food.protein),
      fat: String(food.fat),
      fiber: String(food.fiber ?? ''),
      amount: '100',
    })
    setSearchAmount('100')
    setShowDropdown(false)
    setSearch('')
  }

  function clearSelectedFood() {
    setSelectedFood(null)
    setSearchAmount('100')
    setForm({ name: '', calories: '', carbs: '', protein: '', fat: '', fiber: '', amount: '100' })
  }

  // ---- Live-Skalierung wenn Menge geändert wird (nur bei Such-Lebensmittel) ----
  function handleSearchAmountChange(val: string) {
    setSearchAmount(val)
    if (!selectedFood) return
    const g = parseFloat(val) || 0
    const m = g / 100
    setForm(prev => ({
      ...prev,
      amount: val,
      calories: round1(m * selectedFood.calories),
      carbs: round1(m * selectedFood.carbs),
      protein: round1(m * selectedFood.protein),
      fat: round1(m * selectedFood.fat),
      fiber: String(selectedFood.fiber != null ? round1(m * selectedFood.fiber) : ''),
    }))
  }

  function round1(v: number) { return Math.round(v * 10) / 10 }

  // ---- Manuelle Felder ----
  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
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
          <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>🔍 Suche</button>
          <button className={`tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => navigate('/scan')}>📷 Scan</button>
          <button className={`tab ${tab === 'photo' ? 'active' : ''}`} onClick={() => navigate('/photo-scan')}>📸 Foto</button>
          <button className={`tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>✏️ Manuell</button>
        </div>

        {/* ==================== SUCHE-TAB ==================== */}
        {tab === 'search' && (
          <>
            {/* Suchfeld mit Autovervollständigung */}
            <div ref={searchRef} style={{ position: 'relative', marginBottom: 8 }}>
              <div className="search-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="search-input"
                  placeholder="Lebensmittel eingeben..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                />
                {searching && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #E2E8F0', borderTopColor: '#00CDBB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                )}
              </div>

              {/* Autovervollständigungs-Dropdown */}
              {showDropdown && results.length > 0 && (
                <div className="autocomplete-dropdown">
                  {results.map((food, i) => (
                    <div key={i} className="autocomplete-item" onClick={() => selectFood(food)}>
                      <div className="autocomplete-item-info">
                        <div className="autocomplete-item-name">{food.name}</div>
                        {food.brand && <div className="autocomplete-item-brand">{food.brand}</div>}
                        <div className="autocomplete-item-macros">
                          P: {food.protein}g · K: {food.carbs}g · F: {food.fat}g
                        </div>
                      </div>
                      <div className="autocomplete-item-kcal">{food.calories}<span>kcal/100g</span></div>
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && !searching && results.length === 0 && search.trim() && (
                <div className="autocomplete-dropdown">
                  <div style={{ padding: '14px 16px', color: '#94A3B8', fontSize: 14, textAlign: 'center' }}>Keine Ergebnisse gefunden</div>
                </div>
              )}
            </div>

            {/* Ausgewähltes Lebensmittel → Portion eingeben */}
            {selectedFood && (
              <div className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>{selectedFood.brand || 'Lebensmittel'}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#172337' }}>{selectedFood.name}</div>
                  </div>
                  <button onClick={clearSelectedFood} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8', padding: '2px 6px' }}>✕</button>
                </div>

                {/* Menge */}
                <div className="input-group" style={{ marginBottom: 10 }}>
                  <label>Menge (g)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={searchAmount}
                    onChange={e => handleSearchAmountChange(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Live Nährwerte */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div className="macro-pill">
                    <span className="macro-pill-label">Kalorien</span>
                    <span className="macro-pill-value">{form.calories || '0'} kcal</span>
                  </div>
                  <div className="macro-pill">
                    <span className="macro-pill-label">Protein</span>
                    <span className="macro-pill-value">{form.protein || '0'} g</span>
                  </div>
                  <div className="macro-pill">
                    <span className="macro-pill-label">Kohlenhydrate</span>
                    <span className="macro-pill-value">{form.carbs || '0'} g</span>
                  </div>
                  {form.fiber !== undefined && form.fiber !== '' && (
                    <div className="macro-pill">
                      <span className="macro-pill-label">Ballaststoffe</span>
                      <span className="macro-pill-value">{form.fiber} g</span>
                    </div>
                  )}
                  <div className="macro-pill">
                    <span className="macro-pill-label">Fett</span>
                    <span className="macro-pill-value">{form.fat || '0'} g</span>
                  </div>
                </div>

                {/* Mahlzeitstyp + Datum */}
                <div className="meal-type-row" style={{ marginBottom: 10 }}>
                  {MEAL_TYPES.map(t => (
                    <button key={t.key} className={`meal-type-btn ${mealType === t.key ? 'active' : ''}`}
                      onClick={() => setMealType(t.key)}>{t.label}</button>
                  ))}
                </div>
                <div className="input-group" style={{ marginBottom: 10 }}>
                  <label>Datum</label>
                  <input className="input" type="date" value={date}
                    onChange={e => setDate(e.target.value)} />
                </div>

                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Speichern...' : '✓ Mahlzeit speichern'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ==================== FOTO-TAB (von PhotoAI) ==================== */}
        {tab === 'photo' && photoAddedItems.length > 0 && (
          <>
            <div className="card" style={{ background: '#0B1730', color: '#fff', marginBottom: 14, padding: '12px 16px' }}>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>📸 Erkannte Lebensmittel – Menge prüfen &amp; bestätigen</div>
            </div>
            {photoAddedItems.map((item, idx) => (
              <div key={idx} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>~{item.amount}g · AI-Schätzung</div>
                  </div>
                  <span className="macro-pill"><span className="macro-pill-value">{item.calories} kcal</span></span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    { label: 'Protein', val: item.protein + 'g' },
                    { label: 'Kohlenhydrate', val: item.carbs + 'g' },
                    { label: 'Fett', val: item.fat + 'g' },
                  ].map(m => (
                    <div key={m.label} className="macro-pill" style={{ flexDirection: 'column', alignItems: 'center', padding: '6px 4px' }}>
                      <span className="macro-pill-label" style={{ fontSize: 10 }}>{m.label}</span>
                      <span className="macro-pill-value">{m.val}</span>
                    </div>
                  ))}
                </div>
                <div className="input-group" style={{ marginBottom: 10 }}>
                  <label>Menge anpassen (g)</label>
                  <input className="input" type="number" min="1"
                    defaultValue={item.amount}
                    onChange={e => {
                      const g = parseFloat(e.target.value) || item.amount
                      const scale = g / item.amount
                      setPhotoAddedItems(prev => prev.map((p, i) => i === idx ? {
                        ...p, amount: g,
                        calories: Math.round(p.calories * scale * 10) / 10,
                        carbs: Math.round(p.carbs * scale * 10) / 10,
                        protein: Math.round(p.protein * scale * 10) / 10,
                        fat: Math.round(p.fat * scale * 10) / 10,
                      } : p))
                    }} />
                </div>
                <div className="meal-type-row" style={{ marginBottom: 10 }}>
                  {MEAL_TYPES.map(t => (
                    <button key={t.key} className={`meal-type-btn ${mealType === t.key ? 'active' : ''}`}
                      onClick={() => setMealType(t.key)}>{t.label}</button>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={async () => {
                    setSaving(true)
                    try {
                      await addMeal(token, {
                        name: item.name, calories: item.calories, carbs: item.carbs,
                        protein: item.protein, fat: item.fat, fiber: item.fiber ?? 0,
                        amount: item.amount, type: mealType, date,
                      })
                      const remaining = photoAddedItems.filter((_, i) => i !== idx)
                      setPhotoAddedItems(remaining)
                      if (remaining.length === 0) navigate('/dashboard')
                    } catch { setError('Fehler beim Speichern') }
                    setSaving(false)
                  }}>
                  ✓ Mahlzeit speichern
                </button>
              </div>
            ))}
            <button className="btn-secondary" style={{ width: '100%', marginTop: 2 }}
              onClick={() => { setPhotoAddedItems([]); setTab('search') }}>
              ✕ Verwerfen &amp; zurück
            </button>
          </>
        )}

        {/* ==================== MANUELL-TAB ==================== */}
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </button>
        <button className="nav-item active" onClick={() => navigate('/add')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Hinzufügen
        </button>
        <button className="nav-item" onClick={() => navigate('/history')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Verlauf
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profil
        </button>
      </nav>
    </div>
  )
}
