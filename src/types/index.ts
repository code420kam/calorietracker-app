export interface User {
  id: string
  name: string
  email: string
  gender?: string
  age?: number
  height?: number
  weight?: number
  activityLevel?: string
  tdee?: number
  bmr?: number
  dailyGoals: DailyGoals
}

export interface DailyGoals {
  calories: number
  carbs: number
  protein: number
  fat: number
  water: number
}

export interface Meal {
  id: string
  user_id: string
  name: string
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
  amount: number
  type: string
  date: string
  created_at: number
}

export interface FoodSearchResult {
  name: string
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber?: number
  brand?: string
}

export interface DailyTotals {
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
}

// ─── Activity ────────────────────────────────────────────────────────────────

export type ActivityType = 'steps' | 'walking' | 'running' | 'cycling' | 'gym' | 'other'

export interface Activity {
  id: string
  user_id: string
  type: ActivityType
  date: string
  duration: number   // minutes
  distance: number   // km
  calories: number   // burned (estimated)
  created_at: number
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  steps: '👟 Schritte',
  walking: '🚶 Gehen',
  running: '🏃 Laufen',
  cycling: '🚴 Radfahren',
  gym: '🏋️ Fitnessstudio',
  other: '🏅 Sonstige',
}

// ─── Favorites / Recent ──────────────────────────────────────────────────────

export interface FavoriteFood {
  id: string
  user_id: string
  name: string
  brand?: string
  calories: number   // per amount
  carbs: number
  protein: number
  fat: number
  fiber: number
  amount: number     // reference amount (usually 100g)
  created_at: number
}

export interface RecentFood {
  id: string
  user_id: string
  name: string
  brand?: string
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
  amount: number
  used_at: number
}

// ─── Water ───────────────────────────────────────────────────────────────────

export interface WaterEntry {
  id: string
  user_id: string
  date: string
  amount: number   // ml
  created_at: number
}

export interface WaterDay {
  entries: WaterEntry[]
  total: number   // ml
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardData {
  meals: Meal[]
  activities: Activity[]
  waterConsumed: number   // ml
  summary: {
    bmr: number
    tdee: number
    activityCalories: number
    totalBurned: number
    mealCalories: number
    remaining: number
    waterGoal: number
  }
  dailyGoals: DailyGoals
}

// ─── Photo AI ────────────────────────────────────────────────────────────────

export interface RecognizedFood {
  name: string
  brand?: string
  estimatedAmount: number   // grams
  amountRange: [number, number]  // min, max grams (AI uncertainty)
  alternatives?: string[]
  // per-100g values from OFF search
  caloriesPer100g: number
  carbsPer100g: number
  proteinPer100g: number
  fatPer100g: number
  fiberPer100g: number
}
