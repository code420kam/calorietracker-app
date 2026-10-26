import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BarcodeScanner from '../components/BarcodeScanner'
import BarcodeResult from '../components/BarcodeResult'
import BarcodeNotFound from '../components/BarcodeNotFound'
import { lookupBarcode, type OFFProduct } from '../services/openFoodFactsApi'

type Step = 'scanner' | 'loading' | 'found' | 'not_found' | 'error'

export default function BarcodeScanPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('scanner')
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState<OFFProduct | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleScan(code: string) {
    setBarcode(code)
    setStep('loading')
    try {
      const result = await lookupBarcode(code)
      if (result.status === 'found' && result.product) {
        setProduct(result.product)
        setStep('found')
      } else {
        setErrorMsg(result.message || 'Produkt nicht gefunden')
        setStep('not_found')
      }
    } catch {
      setErrorMsg('Fehler bei der Abfrage')
      setStep('error')
    }
  }

  if (step === 'scanner') {
    return <BarcodeScanner onScan={handleScan} onClose={() => navigate('/add')} />
  }

  if (step === 'loading') {
    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => navigate('/add')}>‹</button>
          <h1>Produkt wird geladen...</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, border: '4px solid #E2E8F0', borderTopColor: '#00CDBB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#64748B', fontSize: 15 }}>Produkt wird gesucht...</p>
          <p style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'monospace' }}>{barcode}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="page">
        <div className="header-bar">
          <button className="back" onClick={() => navigate('/add')}>‹</button>
          <h1>Fehler</h1>
          <div style={{ width: 60 }} />
        </div>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <h3 style={{ color: '#172337', margin: 0 }}>{errorMsg}</h3>
          <p style={{ color: '#64748B', fontSize: 14 }}>Prüfe deine Internetverbindung und versuche es erneut.</p>
          <button className="btn btn-primary" onClick={() => setStep('scanner')}>Erneut scannen</button>
        </div>
      </div>
    )
  }

  if (step === 'not_found' && product === null) {
    return (
      <BarcodeNotFound
        barcode={barcode}
        onRescan={() => setStep('scanner')}
        onSelectFood={(food) => {
          // Navigate to add meal pre-filled with searched food
          navigate('/add', { state: { prefill: food } })
        }}
      />
    )
  }

  if (step === 'found' && product) {
    return (
      <BarcodeResult
        product={product}
        onRescan={() => setStep('scanner')}
        onClose={() => navigate('/add')}
      />
    )
  }

  return null
}
