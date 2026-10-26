import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddMeal from './pages/AddMeal'
import History from './pages/History'
import Profile from './pages/Profile'
import BarcodeScanPage from './pages/BarcodeScanPage'
import Water from './pages/Water'
import Activities from './pages/Activities'
import Favorites from './pages/Favorites'
import PhotoAIScan from './pages/PhotoAIScan'

export default function App() {
  const [token, setToken] = React.useState<string | null>(localStorage.getItem('ct_token'))

  const logout = () => {
    localStorage.removeItem('ct_token')
    localStorage.removeItem('ct_user')
    setToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={setToken} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={token ? <Dashboard token={token!} logout={logout} /> : <Navigate to="/login" />} />
        <Route path="/add" element={token ? <AddMeal token={token!} /> : <Navigate to="/login" />} />
        <Route path="/history" element={token ? <History logout={logout} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={token ? <Profile token={token!} logout={logout} /> : <Navigate to="/login" />} />
        <Route path="/scan" element={token ? <BarcodeScanPage /> : <Navigate to="/login" />} />
        <Route path="/water" element={token ? <Water token={token!} /> : <Navigate to="/login" />} />
        <Route path="/activities" element={token ? <Activities token={token!} /> : <Navigate to="/login" />} />
        <Route path="/favorites" element={token ? <Favorites token={token!} /> : <Navigate to="/login" />} />
        <Route path="/photo-scan" element={
          token ? <PhotoAIScan token={token!}
            onConfirm={(items) => {
              // Navigate to add page with pre-filled items
              window.location.href = '/add?photoItems=' + encodeURIComponent(JSON.stringify(items))
            }}
            onCancel={() => window.history.back()}
          /> : <Navigate to="/login" />
        } />
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}
