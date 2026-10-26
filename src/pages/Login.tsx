import React, { useState } from 'react'
import { login, register } from '../stores/authStore'

interface Props {
  onLogin: (token: string) => void
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await login(email, password)
        localStorage.setItem('ct_token', res.token)
        localStorage.setItem('ct_user', JSON.stringify(res.user))
        onLogin(res.token)
      } else {
        if (!name.trim()) { setError('Bitte gib deinen Namen ein'); setLoading(false); return }
        const res = await register(name, email, password)
        localStorage.setItem('ct_token', res.token)
        localStorage.setItem('ct_user', JSON.stringify(res.user))
        onLogin(res.token)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-content">
        <div className="logo-wrap" style={{ paddingTop: 60 }}>
          <div className="logo-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8 2 4 6 4 10C4 14 8 18 12 22C16 18 20 14 20 10C20 6 16 2 12 2Z" fill="#00CDBB" opacity="0.3"/>
              <path d="M8 10C8 7.8 9.8 6 12 6C14.2 6 16 7.8 16 10C16 12.2 14.2 14 12 14C9.8 14 8 12.2 8 10Z" fill="#00CDBB"/>
            </svg>
          </div>
          <div className="logo-name">Calorie<span>Track</span></div>
          <div className="logo-sub">Dein täglicher Ernährungsassistent</div>
        </div>

        <div className="card" style={{ margin: '0 20px' }}>
          <div className="toggle-row">
            <button className={`toggle-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Anmelden</button>
            <button className={`toggle-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Registrieren</button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="input-group">
                <label>Name</label>
                <input className="input" type="text" placeholder="Max Mustermann" value={name}
                  onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
            )}
            <div className="input-group">
              <label>E-Mail</label>
              <input className="input" type="email" placeholder="deine@email.de" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="input-group">
              <label>Passwort</label>
              <input className="input" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
            {error && <p className="text-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Bitte warten...' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', padding: '16px 20px', lineHeight: 1.6 }}>
          Mit der Nutzung stimmst du unserer Datenschutzerklärung zu.<br/>Deine Daten werden sicher in Deutschland gespeichert.
        </p>
      </div>
    </div>
  )
}
