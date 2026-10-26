import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OFFProduct } from '../services/openFoodFactsApi'
import { addMeal } from '../stores/authStore'

interface Props {
  product: OFFProduct
  onRescan: () => void
  onClose: () => void
}

const MEAL_TYPES = [
  { key: 'breakfast', label: '🍳 Frühstück' },
  { key: 'lunch', label: '🍽️ Mittag' },
  { key: 'dinner', label: '🍝 Abend' },
  { key: 'snack', label: '🍿 Snack' },
]

export default function BarcodeResult({ product, onRescan, onClose }: Props) {
  const navigate = useNavigate()
  const [mealType, setMealType] = useState('snack')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('100')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const multiplier = parseFloat(amount) / 100

  const scaled = {
    calories: Math.round(product.calories * multiplier * 10) / 10,
    carbs: Math.round(product.carbs * multiplier * 10) / 10,
    sugar: Math.round(product.sugar * multiplier * 10) / 10,
    fat: Math.round(product.fat * multiplier * 10) / 10,
    saturatedFat: Math.round(product.saturatedFat * multiplier * 10) / 10,
    protein: Math.round(product.protein * multiplier * 10) / 10,
    fiber: Math.round(product.fiber * multiplier * 10) / 10,
    salt: Math.round(product.salt * multiplier * 10) / 10,
  }

  function MacroRow({ label, value, unit }: { label: string; value: number; unit: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: 14, color: '#64748B' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#172337' }}>{value}{unit}</span>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back" onClick={onClose}>‹</button>
        <h1>Produkt</h1>
        <button
          onClick={onRescan}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer' }}
          title="Neuen Barcode scannen"
        >
          📷
        </button>
      </div>

      <div className="page-content" style={{ paddingBottom: 120 }}>
        {/* Product image */}
        {product.image && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={product.image}
              alt={product.name}
              style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 12, objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        {/* Product header card */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>{product.brand || 'Unbekannte Marke'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#172337', marginBottom: 4 }}>{product.name}</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>EAN: {product.barcode}</div>
        </div>

        {/* Amount selector */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748B', flexShrink: 0 }}>Menge (g/ml)</label>
          </div>
          <input
            className="input"
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ width: '100%' }}
          />
          {product.servingSize && (
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
              💡 Original-Portion: {product.servingSize}
              {product.servingQuantity && ` (${product.servingQuantity}g)`}
            </div>
          )}
        </div>

        {/* Energy card */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Energie</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>pro {amount}g</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#172337' }}>{scaled.calories}</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>kcal</div>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header" style={{ fontSize: 15 }}>Nährwerte</div>
          <MacroRow label="Protein" value={scaled.protein} unit="g" />
          <MacroRow label="Kohlenhydrate" value={scaled.carbs} unit="g" />
          {scaled.sugar > 0 && <MacroRow label="  davon Zucker" value={scaled.sugar} unit="g" />}
          <MacroRow label="Fett" value={scaled.fat} unit="g" />
          {scaled.saturatedFat > 0 && <MacroRow label="  davon gesättigt" value={scaled.saturatedFat} unit="g" />}
          {scaled.fiber > 0 && <MacroRow label="Ballaststoffe" value={scaled.fiber} unit="g" />}
          {scaled.salt > 0 && <MacroRow label="Salz" value={scaled.salt} unit="g" />}
          {scaled.salt === 0 && scaled.sodium > 0 && <MacroRow label="Natrium" value={scaled.sodium} unit="g" />}
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Bezogen auf 100g: {product.calories} kcal</div>
        </div>

        {/* Meal type */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header" style={{ fontSize: 15 }}>Mahlzeit</div>
          <div className="meal-type-row">
            {MEAL_TYPES.map(t => (
              <button
                key={t.key}
                className={`meal-type-btn ${mealType === t.key ? 'active' : ''}`}
                onClick={() => setMealType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="input-group">
            <label>Datum</label>
            <input className="input" type="date" value={date}
              onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {error && <div className="text-error" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Save button */}
        <button
          className="btn btn-primary"
          onClick={async () => {
            setError('')
            setSaving(true)
            try {
              const token = localStorage.getItem('ct_token')
              if (!token) { navigate('/login'); return }
              await addMeal(token, {
                name: product.name,
                calories: scaled.calories,
                carbs: scaled.carbs,
                protein: scaled.protein,
                fat: scaled.fat,
                fiber: scaled.fiber,
                amount: parseFloat(amount) || 100,
                type: mealType,
                date,
              })
              navigate('/dashboard')
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
            }
            setSaving(false)
          }}
          disabled={saving}
          style={{ marginBottom: 16 }}
        >
          {saving ? 'Speichern...' : '✓ Mahlzeit speichern'}
        </button>

        <button className="btn btn-secondary" onClick={onRescan}>
          📷 Weitere Lebensmittel scannen
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
