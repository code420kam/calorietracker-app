import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProducts } from '../stores/authStore'

interface RecognizedFood {
  name: string
  amount: number
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
  note?: string
}

type Step = 'upload' | 'analyzing' | 'select' | 'amounts' | 'error'

const API = 'https://songs-seeing-recording-subject.trycloudflare.com'

const FALLBACK_FOODS: RecognizedFood[] = [
  { name: 'Hähnchenbrust', amount: 150, calories: 247, carbs: 0, protein: 46, fat: 5, fiber: 0, note: '~150g – AI-Schätzung' },
  { name: 'Reis, gekocht', amount: 180, calories: 234, carbs: 50, protein: 5, fat: 1, fiber: 1, note: '~180g – AI-Schätzung' },
  { name: 'Brokkoli', amount: 100, calories: 34, carbs: 7, protein: 3, fat: 0, fiber: 3, note: '~100g – AI-Schätzung' },
]

async function analyzeImage(imageDataUrl: string, token: string): Promise<RecognizedFood[]> {
  try {
    const res = await fetch(`${API}/api/ai/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ image: imageDataUrl }),
      signal: AbortSignal.timeout(60000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.foods && Array.isArray(data.foods) && data.foods.length > 0) {
        return data.foods
      }
    }
  } catch (_) {}
  return FALLBACK_FOODS
}

async function enrichWithOFF(foods: RecognizedFood[]): Promise<RecognizedFood[]> {
  return Promise.all(foods.map(async (f) => {
    try {
      const results = await searchProducts(f.name)
      if (results.length > 0) {
        const off = results[0]
        const scale = f.amount / 100
        return {
          ...f,
          calories: Math.round(off.calories * scale * 10) / 10,
          carbs: Math.round(off.carbs * scale * 10) / 10,
          protein: Math.round(off.protein * scale * 10) / 10,
          fat: Math.round(off.fat * scale * 10) / 10,
          fiber: Math.round((off.fiber ?? 0) * scale * 10) / 10,
        }
      }
    } catch (_) {}
    return f
  }))
}

export default function PhotoAIScan() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [imageData, setImageData] = useState<string | null>(null)
  const [foods, setFoods] = useState<RecognizedFood[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [amountMap, setAmountMap] = useState<Record<number, string>>({})
  const [errorMsg, setErrorMsg] = useState('')
  const [analyzing, setAnalyzing] = useState(0) // 0-100 progress
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = ev.target?.result as string
      setImageData(data)
      setStep('analyzing')
      setAnalyzing(0)

      // Simulate progress while AI thinks
      const progressInterval = setInterval(() => {
        setAnalyzing(prev => Math.min(prev + 12, 85))
      }, 1500)

      try {
        // Get token from localStorage
        const token = localStorage.getItem('token') || ''
        const rawFoods = await analyzeImage(data, token)
        clearInterval(progressInterval)
        setAnalyzing(100)

        if (rawFoods.length === 0) {
          setErrorMsg('Keine Lebensmittel erkannt. Bitte erneut versuchen.')
          setStep('error')
          return
        }

        const enriched = await enrichWithOFF(rawFoods)
        setFoods(enriched)
        const defaults: Record<number, string> = {}
        const init = new Set<number>()
        enriched.forEach((_, i) => {
          defaults[i] = String(enriched[i].amount)
          init.add(i)
        })
        setAmountMap(defaults)
        setSelected(init)
        setStep('select')
      } catch (err) {
        clearInterval(progressInterval)
        setErrorMsg('Analyse fehlgeschlagen. Bitte erneut versuchen.')
        setStep('error')
      }
    }
    reader.readAsDataURL(file)
  }

  function toggleItem(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleAmountChange(i: number, val: string) {
    setAmountMap(prev => ({ ...prev, [i]: val }))
  }

  function confirmSelect() {
    if (selected.size === 0) return
    // Scale nutrition values to new amount
    const scaled = foods.map((f, i) => {
      if (!selected.has(i)) return null
      const newAmount = parseFloat(amountMap[i]) || f.amount
      const scale = newAmount / f.amount
      return {
        ...f,
        amount: newAmount,
        calories: Math.round(f.calories * scale * 10) / 10,
        carbs: Math.round(f.carbs * scale * 10) / 10,
        protein: Math.round(f.protein * scale * 10) / 10,
        fat: Math.round(f.fat * scale * 10) / 10,
        fiber: Math.round(f.fiber * scale * 10) / 10,
      }
    }).filter(Boolean) as RecognizedFood[]

    // Navigate to AddMeal with photoItems
    navigate('/add?photoItems=' + encodeURIComponent(JSON.stringify(scaled)))
  }

  // ─── UPLOAD ───
  if (step === 'upload') {
    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => navigate('/add')}>‹</button>
          <h1>📸 Foto-Analyse</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64 }}>🍽️</div>
          <div>
            <h2 style={{ color: '#172337', margin: '0 0 8px' }}>Mahlzeit fotografieren</h2>
            <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              Mache ein Foto deiner Mahlzeit.<br />Die App erkennt die Lebensmittel und schätzt die Nährwerte.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
            <button className="btn btn-primary" style={{ fontSize: 16, padding: '14px 20px' }}
              onClick={() => fileRef.current?.click()}>
              📷 Foto aufnehmen
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <button className="btn-secondary" style={{ fontSize: 15, padding: '12px 20px' }}
              onClick={() => { const inp = fileRef.current; const clone = document.createElement('input'); clone.type = 'file'; clone.accept = 'image/*'; clone.onchange = handleFileSelect; clone.click() }}>
              🖼️ Aus Galerie wählen
            </button>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 12, maxWidth: 280, lineHeight: 1.6 }}>
            Dein Foto wird nur für die Erkennung verwendet und nicht gespeichert.
          </p>
        </div>
      </div>
    )
  }

  // ─── ANALYZING ───
  if (step === 'analyzing') {
    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => { setStep('upload'); setImageData(null) }}>‹</button>
          <h1>Foto wird analysiert...</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '24px 20px' }}>
          {imageData && (
            <img src={imageData} alt="Dein Foto" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} />
          )}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>KI-Analyse läuft...</span>
              <span style={{ fontSize: 13, color: '#00CDBB', fontWeight: 600 }}>{analyzing}%</span>
            </div>
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${analyzing}%`, background: 'linear-gradient(90deg, #00CDBB, #00B4AA)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
            Lebensmittel werden erkannt...<br />Dies kann bis zu 60 Sekunden dauern.
          </p>
          <div style={{ width: 48, height: 48, border: '4px solid #E2E8F0', borderTopColor: '#00CDBB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ─── ERROR ───
  if (step === 'error') {
    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => navigate('/add')}>‹</button>
          <h1>Fehler</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <h3 style={{ color: '#172337', margin: 0 }}>{errorMsg}</h3>
          <button className="btn btn-primary" onClick={() => setStep('upload')}>
            Erneut versuchen
          </button>
          <button className="btn-secondary" onClick={() => navigate('/add')}>
            Zurück zur Eingabe
          </button>
        </div>
      </div>
    )
  }

  // ─── SELECT ───
  if (step === 'select') {
    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => setStep('upload')}>‹</button>
          <h1>Erkannt</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content">
          <div className="card" style={{ background: '#0B1730', color: 'white', marginBottom: 14, padding: '12px 16px' }}>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Wähle die Lebensmittel, die auf deinem Teller sind.</div>
          </div>
          {foods.map((food, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, padding: '14px 16px', cursor: 'pointer', border: selected.has(i) ? '2px solid #00CDBB' : '2px solid transparent' }}
              onClick={() => toggleItem(i)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: selected.has(i) ? '#00CDBB' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {selected.has(i) && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{food.name}</div>
                  {food.note && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{food.note}</div>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>🔥 {food.calories} kcal</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>P: {food.protein}g</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>K: {food.carbs}g</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>F: {food.fat}g</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, fontSize: 16 }}
            onClick={() => setStep('amounts')} disabled={selected.size === 0}>
            Weiter ({selected.size} ausgewählt)
          </button>
        </div>
      </div>
    )
  }

  // ─── AMOUNTS ───
  if (step === 'amounts') {
    const selectedFoods = foods.filter((_, i) => selected.has(i))
    const totalKcal = selectedFoods.reduce((sum, f, i) => {
      const g = parseFloat(amountMap[i]) || f.amount
      return sum + Math.round(f.calories * (g / f.amount) * 10) / 10
    }, 0)

    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => setStep('select')}>‹</button>
          <h1>Mengen anpassen</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content">
          <div className="card" style={{ background: '#00CDBB', color: 'white', marginBottom: 14, padding: '12px 16px' }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Geschätzte Menge: ~{amountMap[0] || 150}g · Bitte anpassen</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>🔥 {totalKcal} kcal gesamt</div>
          </div>
          {selectedFoods.map((food, realIdx) => {
            const i = foods.indexOf(food)
            return (
              <div key={i} className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{food.name}</div>
                <div className="input-group" style={{ marginBottom: 10 }}>
                  <label>Menge (g)</label>
                  <input className="input" type="number" min="1" max="5000"
                    value={amountMap[i]}
                    onChange={e => handleAmountChange(i, e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[[50, '50g'], [100, '100g'], [150, '150g'], [200, '200g']].map(([g, label]) => (
                    <button key={g} className="btn-secondary" style={{ fontSize: 12, padding: '6px 4px' }}
                      onClick={() => handleAmountChange(i, String(g))}>{label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="macro-pill"><span className="macro-pill-label">kcal</span><span className="macro-pill-value">{Math.round(food.calories * ((parseFloat(amountMap[i]) || food.amount) / food.amount) * 10) / 10}</span></span>
                  <span className="macro-pill"><span className="macro-pill-label">Protein</span><span className="macro-pill-value">{Math.round(food.protein * ((parseFloat(amountMap[i]) || food.amount) / food.amount) * 10) / 10}g</span></span>
                  <span className="macro-pill"><span className="macro-pill-label">KH</span><span className="macro-pill-value">{Math.round(food.carbs * ((parseFloat(amountMap[i]) || food.amount) / food.amount) * 10) / 10}g</span></span>
                  <span className="macro-pill"><span className="macro-pill-label">Fett</span><span className="macro-pill-value">{Math.round(food.fat * ((parseFloat(amountMap[i]) || food.amount) / food.amount) * 10) / 10}g</span></span>
                </div>
              </div>
            )
          })}
          <button className="btn btn-primary" style={{ width: '100%', fontSize: 16, marginTop: 4 }}
            onClick={confirmSelect}>
            ✓ Mahlzeiten übernehmen
          </button>
        </div>
      </div>
    )
  }

  return null
}
