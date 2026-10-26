import React, { useState } from 'react'
import { login, register } from '../stores/authStore'

interface Props {
  onLogin: (token: string) => void
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    gender: 'male', age: '30', height: '175', weight: '70', activityLevel: 'moderate'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await login(form.email, form.password)
        localStorage.setItem('ct_token', res.token)
        localStorage.setItem('ct_user', JSON.stringify(res.user))
        onLogin(res.token)
      } else {
        if (!form.name.trim() || !form.email || !form.password) {
          setError('Bitte alle Pflichtfelder ausfüllen'); setLoading(false); return
        }
        const res = await register({
          name: form.name, email: form.email, password: form.password,
          gender: form.gender, age: parseInt(form.age), height: parseInt(form.height),
          weight: parseFloat(form.weight), activityLevel: form.activityLevel,
        })
        localStorage.setItem('ct_token', res.token)
        localStorage.setItem('ct_user', JSON.stringify(res.user))
        onLogin(res.token)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler aufgetreten')
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="logo-wrap">
        <div className="logo-icon">🍽️</div>
        <div className="logo-name">Calorie<span>Track</span></div>
        <div className="logo-sub">Dein täglicher Ernährungsassistent</div>
      </div>

      <div className="card" style={{ margin: '0 20px 20px' }}>
        <div className="toggle-row">
          <button className={`toggle-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Anmelden</button>
          <button className={`toggle-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Registrieren</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="input-group">
                <label>Name</label>
                <input className="input" type="text" placeholder="Dein Name" value={form.name}
                  onChange={e => update('name', e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Geschlecht</label>
                  <select className="input" value={form.gender} onChange={e => update('gender', e.target.value)}>
                    <option value="male">Männlich</option>
                    <option value="female">Weiblich</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Alter</label>
                  <input className="input" type="number" min="10" max="100" value={form.age}
                    onChange={e => update('age', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Größe (cm)</label>
                  <input className="input" type="number" min="100" max="250" value={form.height}
                    onChange={e => update('height', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Gewicht (kg)</label>
                  <input className="input" type="number" min="30" max="300" step="0.1" value={form.weight}
                    onChange={e => update('weight', e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label>Aktivitätslevel</label>
                <select className="input" value={form.activityLevel} onChange={e => update('activityLevel', e.target.value)}>
                  <option value="sedentary">🔌 Sitzend (Büro, kaum Bewegung)</option>
                  <option value="light">🚶 Leicht aktiv (1-2x/Woche)</option>
                  <option value="moderate">🚴 Moderat aktiv (3-4x/Woche)</option>
                  <option value="active">🏃 Sehr aktiv (5-6x/Woche)</option>
                  <option value="very_active">💪 Extrem aktiv (täglich Sport)</option>
                </select>
              </div>
            </>
          )}

          <div className="input-group">
            <label>E-Mail</label>
            <input className="input" type="email" placeholder="deine@email.de" value={form.email}
              onChange={e => update('email', e.target.value)} required />
          </div>

          <div className="input-group">
            <label>Passwort</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => update('password', e.target.value)} required />
          </div>

          {error && <div className="text-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Lädt...' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}
