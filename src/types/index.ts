export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  dailyGoals: DailyGoals
  createdAt: number
}

export interface DailyGoals {
  calories: number
  carbs: number
  protein: number
  fat: number
}

export interface Meal {
  id: string
  userId: string
  name: string
  calories: number
  carbs: number
  protein: number
  fat: number
  amount: number
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: string // YYYY-MM-DD
  createdAt: number
}

export interface FoodSearchResult {
  id: string
  name: string
  brand?: string
  barcode?: string
  calories: number
  carbs: number
  protein: number
  fat: number
  servingSize: number
}

export interface DailyTotals {
  calories: number
  carbs: number
  protein: number
  fat: number
}
