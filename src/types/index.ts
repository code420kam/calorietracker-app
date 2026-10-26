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
  brand?: string
}

export interface DailyTotals {
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
}
