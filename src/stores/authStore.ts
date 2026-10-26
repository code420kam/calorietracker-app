import { User, Meal, DailyGoals } from '../types'

const API_BASE = 'https://ct-api-live.loca.lt/api'

export interface AuthResponse {
  token: string
  user: Omit<User, 'passwordHash'>
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Login fehlgeschlagen')
  }
  return res.json()
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Registrierung fehlgeschlagen')
  }
  return res.json()
}

export async function getMeals(token: string, date: string): Promise<Meal[]> {
  const res = await fetch(`${API_BASE}/meals?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Mahlzeiten konnten nicht geladen werden')
  return res.json()
}

export async function addMeal(token: string, meal: Omit<Meal, 'id' | 'createdAt'>): Promise<Meal> {
  const res = await fetch(`${API_BASE}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(meal),
  })
  if (!res.ok) throw new Error('Mahlzeit konnte nicht gespeichert werden')
  return res.json()
}

export async function deleteMeal(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/meals/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Mahlzeit konnte nicht gelöscht werden')
}

export async function updateGoals(token: string, goals: DailyGoals): Promise<void> {
  const res = await fetch(`${API_BASE}/users/goals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(goals),
  })
  if (!res.ok) throw new Error('Ziele konnten nicht aktualisiert werden')
}

export async function searchProducts(query: string): Promise<{ name: string; calories: number; carbs: number; protein: number; fat: number; brand?: string }[]> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.products || []).map((p: Record<string, unknown>) => ({
      name: String(p.product_name || p.product_name_de || 'Unbekannt'),
      calories: Math.round(Number(p.nutriments?.['energy-kcal_100g'] || 0)),
      carbs: Math.round(Number(p.nutriments?.carbohydrates_100g || 0) * 10) / 10,
      protein: Math.round(Number(p.nutriments?.proteins_100g || 0) * 10) / 10,
      fat: Math.round(Number(p.nutriments?.fat_100g || 0) * 10) / 10,
      brand: String(p.brands || ''),
    })).filter((p: { name: string }) => p.name !== 'Unbekannt' && p.calories > 0)
  } catch {
    return []
  }
}
