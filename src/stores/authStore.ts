import type { User, Meal, DailyGoals } from '../types'

export function getBaseURL() {
  // Use the deployed backend on Render
  return 'https://plain-monkeys-turn.loca.lt/api'
}

export interface AuthResponse {
  token: string
  user: User
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${getBaseURL()}/auth/login`, {
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

export async function register(data: {
  name: string
  email: string
  password: string
  gender?: string
  age?: number
  height?: number
  weight?: number
  activityLevel?: string
}): Promise<AuthResponse> {
  const res = await fetch(`${getBaseURL()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Registrierung fehlgeschlagen')
  }
  return res.json()
}

export async function getMeals(token: string, date: string): Promise<Meal[]> {
  const res = await fetch(`${getBaseURL()}/meals?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Mahlzeiten konnten nicht geladen werden')
  return res.json()
}

export async function addMeal(token: string, meal: {
  name: string
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
  amount: number
  type: string
  date: string
}): Promise<Meal> {
  const res = await fetch(`${getBaseURL()}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(meal),
  })
  if (!res.ok) throw new Error('Mahlzeit konnte nicht gespeichert werden')
  return res.json()
}

export async function deleteMeal(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseURL()}/meals/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Mahlzeit konnte nicht gelöscht werden')
}

export async function updateGoals(token: string, goals: DailyGoals): Promise<void> {
  const res = await fetch(`${getBaseURL()}/users/goals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(goals),
  })
  if (!res.ok) throw new Error('Ziele konnten nicht aktualisiert werden')
}

export async function updateProfile(token: string, data: {
  gender?: string
  age?: number
  height?: number
  weight?: number
  activityLevel?: string
}): Promise<{ ok: boolean; tdee: number; bmr: number }> {
  const res = await fetch(`${getBaseURL()}/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Profil konnte nicht aktualisiert werden')
  return res.json()
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
