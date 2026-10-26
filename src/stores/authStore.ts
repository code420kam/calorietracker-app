import type { User, Meal, DailyGoals, Activity, FavoriteFood, RecentFood, WaterDay, DashboardData, FoodSearchResult } from '../types'

export function getBaseURL() {
  return 'https://songs-seeing-recording-subject.trycloudflare.com/api'
}

export async function login(email: string, password: string) {
  const res = await fetch(`${getBaseURL()}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server nicht erreichbar.' }))
    throw new Error(err.error || 'Login fehlgeschlagen')
  }
  return res.json()
}

export async function register(data: {
  name: string; email: string; password: string
  gender?: string; age?: number; height?: number; weight?: number; activityLevel?: string
}) {
  const res = await fetch(`${getBaseURL()}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server nicht erreichbar.' }))
    throw new Error(err.error || 'Registrierung fehlgeschlagen')
  }
  return res.json()
}

export async function getDashboard(token: string, date: string): Promise<DashboardData> {
  const res = await fetch(`${getBaseURL()}/dashboard?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Dashboard konnte nicht geladen werden')
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
  name: string; calories: number; carbs: number; protein: number; fat: number
  fiber: number; amount: number; type: string; date: string
}): Promise<Meal> {
  const res = await fetch(`${getBaseURL()}/meals`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(meal),
  })
  if (!res.ok) throw new Error('Mahlzeit konnte nicht gespeichert werden')
  return res.json()
}

export async function deleteMeal(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseURL()}/meals/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Mahlzeit konnte nicht gelöscht werden')
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export async function updateGoals(token: string, goals: DailyGoals): Promise<void> {
  const res = await fetch(`${getBaseURL()}/users/goals`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(goals),
  })
  if (!res.ok) throw new Error('Ziele konnten nicht aktualisiert werden')
}

export async function updateProfile(token: string, data: {
  gender?: string; age?: number; height?: number; weight?: number
  activityLevel?: string; dailyWater?: number
}): Promise<{ ok: boolean; tdee: number; bmr: number }> {
  const res = await fetch(`${getBaseURL()}/users/profile`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Profil konnte nicht aktualisiert werden')
  return res.json()
}

// ─── Activities ──────────────────────────────────────────────────────────────

export async function getActivities(token: string, date: string): Promise<Activity[]> {
  const res = await fetch(`${getBaseURL()}/activities?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Aktivitäten konnten nicht geladen werden')
  return res.json()
}

export async function addActivity(token: string, activity: {
  type: string; date: string; duration?: number; distance?: number; calories?: number
}): Promise<Activity> {
  const res = await fetch(`${getBaseURL()}/activities`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(activity),
  })
  if (!res.ok) throw new Error('Aktivität konnte nicht gespeichert werden')
  return res.json()
}

export async function deleteActivity(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseURL()}/activities/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Aktivität konnte nicht gelöscht werden')
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export async function getFavorites(token: string): Promise<FavoriteFood[]> {
  const res = await fetch(`${getBaseURL()}/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Favoriten konnten nicht geladen werden')
  return res.json()
}

export async function addFavorite(token: string, food: {
  name: string; brand?: string; calories: number; carbs: number
  protein: number; fat: number; fiber: number; amount: number
}): Promise<FavoriteFood> {
  const res = await fetch(`${getBaseURL()}/favorites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(food),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Konnte nicht zu Favoriten hinzugefügt werden')
  }
  return res.json()
}

export async function removeFavorite(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseURL()}/favorites/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Favorit konnte nicht entfernt werden')
}

// ─── Recent Foods ─────────────────────────────────────────────────────────────

export async function getRecentFoods(token: string): Promise<RecentFood[]> {
  const res = await fetch(`${getBaseURL()}/recent`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Konnte nicht geladen werden')
  return res.json()
}

// ─── Water ────────────────────────────────────────────────────────────────────

export async function getWater(token: string, date: string): Promise<WaterDay> {
  const res = await fetch(`${getBaseURL()}/water?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Wasserdaten konnten nicht geladen werden')
  return res.json()
}

export async function addWater(token: string, date: string, amount: number): Promise<{ ok: boolean; total: number }> {
  const res = await fetch(`${getBaseURL()}/water`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ date, amount }),
  })
  if (!res.ok) throw new Error('Wasser konnte nicht hinzugefügt werden')
  return res.json()
}

export async function removeWater(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseURL()}/water/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Eintrag konnte nicht entfernt werden')
}

// ─── Open Food Facts ─────────────────────────────────────────────────────────

export async function searchProducts(query: string): Promise<FoodSearchResult[]> {
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
      fiber: Math.round(Number(p.nutriments?.fiber_100g || 0) * 10) / 10,
      brand: String(p.brands || ''),
    })).filter((p: FoodSearchResult) => p.name !== 'Unbekannt' && p.calories > 0)
  } catch { return [] }
}
