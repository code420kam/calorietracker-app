import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProducts } from '../stores/authStore'

interface Props {
  barcode: string
  onRescan: () => void
  onSelectFood: (food: { name: string; calories: number; carbs: number; protein: number; fat: number; brand?: string }) => void
}

export default function BarcodeNotFound({ barcode, onRescan, onSelectFood }: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ name: string; calories: number; carbs: number; protein: number; fat: number; brand?: string }[]>([])
  const [searching, setSearching] = useState(false)

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    try {
      const data = await searchProducts(search)
      setResults(data)
    } catch { setResults([]) }
    setSearching(false)
  }

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={onRescan}>‹</button>
        <h1>Produkt nicht gefunden</h1>
        <div style={{ width: 60 }} />
      </div>

      <div className="page-content">
        {/* Not found card */}
        <div className="card" style={{ textAlign: 'center', padding: '28px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#172337' }}>Produkt nicht gefunden</h3>
          <p style={{ margin: 0, color: '#64748B', fontSize: 14, lineHeight: 1.5 }}>
            Der Barcode <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{barcode}</span> ist nicht in der Open Food Facts Datenbank vorhanden.
          </p>
        </div>

        {/* Manual search */}
        <div className="card">
          <div className="card-header">Alternativ suchen</div>
          <div className="search-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              placeholder="Lebensmittel manuell suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="btn btn-secondary" onClick={handleSearch} disabled={searching}>
            {searching ? 'Suche...' : 'Suchen'}
          </button>

          {results.map((food, i) => (
            <div key={i} className="result-item" onClick={() => onSelectFood(food)}>
              <div className="result-item-info">
                <div className="result-item-name">{food.name}</div>
                {food.brand && <div className="result-item-brand">{food.brand}</div>}
                <div className="result-item-macros">P: {food.protein}g · K: {food.carbs}g · F: {food.fat}g</div>
              </div>
              <div className="result-item-kcal">{food.calories}<br /><span style={{ fontSize: 11 }}>kcal/100g</span></div>
            </div>
          ))}
        </div>

        {/* Manual entry shortcut */}
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/add')}>
          ✏️ Manuell erfassen
        </button>

        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={onRescan}>
          📷 Erneut scannen
        </button>
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
