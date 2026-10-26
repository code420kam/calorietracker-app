const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'ct-secret-2024-change-me'

const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'data')
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
const db = new (Database)(path.join(DB_DIR, 'calorietracker.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    gender TEXT DEFAULT 'male',
    age INTEGER DEFAULT 30,
    height INTEGER DEFAULT 175,
    weight REAL DEFAULT 70,
    activity_level TEXT DEFAULT 'moderate',
    daily_calories INTEGER DEFAULT 2000,
    daily_carbs REAL DEFAULT 250,
    daily_protein REAL DEFAULT 100,
    daily_fat REAL DEFAULT 70,
    daily_water INTEGER DEFAULT 2500,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    carbs REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    amount REAL DEFAULT 100,
    type TEXT DEFAULT 'snack',
    date TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    distance REAL DEFAULT 0,
    calories INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, date);

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    calories REAL NOT NULL,
    carbs REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    amount REAL DEFAULT 100,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, name, brand)
  );
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

  CREATE TABLE IF NOT EXISTS recent_foods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    calories REAL NOT NULL,
    carbs REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    amount REAL DEFAULT 100,
    used_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_recent_user ON recent_foods(user_id);

  CREATE TABLE IF NOT EXISTS water_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_logs(user_id, date);
`)

// Migration: add missing columns safely
const addCol = (table, col, def) => { try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`) } catch (_) {} }
addCol('users', 'gender', "TEXT DEFAULT 'male'")
addCol('users', 'age', 'INTEGER DEFAULT 30')
addCol('users', 'height', 'INTEGER DEFAULT 175')
addCol('users', 'weight', 'REAL DEFAULT 70')
addCol('users', 'activity_level', "TEXT DEFAULT 'moderate'")
addCol('users', 'daily_water', 'INTEGER DEFAULT 2500')
addCol('meals', 'fiber', 'REAL DEFAULT 0')

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht autorisiert' })
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Token ungueltig' }) }
}

function calcBMR(gender, age, height, weight) {
  if (gender === 'female') return Math.round(10 * weight + 6.25 * height - 5 * age - 161)
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5)
}

function calcTDEE(bmr, activityLevel) {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
  return Math.round(bmr * (factors[activityLevel] || 1.55))
}

// ─── Auth ───────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, gender, age, height, weight, activityLevel } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Alle Felder erforderlich' })
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'E-Mail bereits registriert' })
    const hash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    const g = gender || 'male'
    const a = parseInt(age) || 30
    const h = parseInt(height) || 175
    const w = parseFloat(weight) || 70
    const al = activityLevel || 'moderate'
    const bmr = calcBMR(g, a, h, w)
    const tdee = calcTDEE(bmr, al)
    db.prepare(`INSERT INTO users (id, name, email, password_hash, gender, age, height, weight, activity_level, daily_calories) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, name, email, hash, g, a, h, w, al, tdee)
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id, name, email, gender: g, age: a, height: h, weight: w, activityLevel: al, tdee, bmr } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) return res.status(401).json({ error: 'Falsche E-Mail oder Passwort' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Falsche E-Mail oder Passwort' })
    const bmr = calcBMR(user.gender, user.age, user.height, user.weight)
    const tdee = calcTDEE(bmr, user.activity_level)
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({
      token, user: {
        id: user.id, name: user.name, email: user.email,
        gender: user.gender, age: user.age, height: user.height,
        weight: user.weight, activityLevel: user.activity_level,
        tdee, bmr,
        dailyGoals: { calories: tdee, carbs: user.daily_carbs, protein: user.daily_protein, fat: user.daily_fat, water: user.daily_water }
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
  const bmr = calcBMR(user.gender, user.age, user.height, user.weight)
  const tdee = calcTDEE(bmr, user.activity_level)
  res.json({
    id: user.id, name: user.name, email: user.email,
    gender: user.gender, age: user.age, height: user.height,
    weight: user.weight, activityLevel: user.activity_level,
    tdee, bmr,
    dailyGoals: { calories: tdee, carbs: user.daily_carbs, protein: user.daily_protein, fat: user.daily_fat, water: user.daily_water }
  })
})

app.put('/api/users/profile', authenticate, (req, res) => {
  const { gender, age, height, weight, activityLevel, dailyWater } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
  const g = gender || user.gender
  const a = parseInt(age) || user.age
  const h = parseInt(height) || user.height
  const w = parseFloat(weight) || user.weight
  const al = activityLevel || user.activity_level
  const dw = parseInt(dailyWater) || user.daily_water
  const bmr = calcBMR(g, a, h, w)
  const tdee = calcTDEE(bmr, al)
  db.prepare(`UPDATE users SET gender=?, age=?, height=?, weight=?, activity_level=?, daily_calories=?, daily_water=? WHERE id=?`)
    .run(g, a, h, w, al, tdee, dw, req.user.id)
  res.json({ ok: true, tdee, bmr })
})

// ─── Dashboard (aggregiert) ──────────────────────────────────────────────────

app.get('/api/dashboard', authenticate, (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'Date required' })
  const uid = req.user.id

  const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC').all(uid, date)
  const activities = db.prepare('SELECT * FROM activities WHERE user_id = ? AND date = ? ORDER BY created_at ASC').all(uid, date)

  const waterRows = db.prepare('SELECT SUM(amount) as total FROM water_logs WHERE user_id = ? AND date = ?').get(uid, date)
  const waterConsumed = waterRows ? (waterRows.total || 0) : 0

  const mealCalories = meals.reduce((s, m) => s + (m.calories || 0), 0)
  const activityCalories = activities.reduce((s, a) => s + (a.calories || 0), 0)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid)
  const bmr = calcBMR(user.gender, user.age, user.height, user.weight)
  const tdee = calcTDEE(bmr, user.activity_level)

  res.json({
    meals, activities, waterConsumed,
    summary: {
      bmr, tdee,
      activityCalories,
      totalBurned: tdee + activityCalories,
      mealCalories,
      remaining: (tdee + activityCalories) - mealCalories,
      waterGoal: user.daily_water,
    },
    dailyGoals: {
      calories: tdee, carbs: user.daily_carbs, protein: user.daily_protein,
      fat: user.daily_fat, water: user.daily_water,
    }
  })
})

// ─── Meals ───────────────────────────────────────────────────────────────────

app.get('/api/meals', authenticate, (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'Date required' })
  const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC').all(req.user.id, date)
  res.json(meals)
})

app.post('/api/meals', authenticate, (req, res) => {
  const { name, calories, carbs, protein, fat, fiber, amount, type, date } = req.body
  if (!name || calories == null || !date) return res.status(400).json({ error: 'Pflichtfelder fehlen' })
  const id = uuidv4()
  db.prepare('INSERT INTO meals (id, user_id, name, calories, carbs, protein, fat, fiber, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, name, calories, carbs || 0, protein || 0, fat || 0, fiber || 0, amount || 100, type || 'snack', date)

  // Update recent foods (keep last 10)
  const existing = db.prepare('SELECT id FROM recent_foods WHERE user_id = ? AND name = ? AND brand IS ?').get(req.user.id, name, brand || null)
  if (existing) {
    db.prepare('UPDATE recent_foods SET used_at = unixepoch(), calories = ?, carbs = ?, protein = ?, fat = ?, fiber = ?, amount = ?, brand = ? WHERE id = ?')
      .run(calories, carbs || 0, protein || 0, fat || 0, fiber || 0, amount || 100, brand || null, existing.id)
  } else {
    const rid = uuidv4()
    db.prepare('INSERT INTO recent_foods (id, user_id, name, brand, calories, carbs, protein, fat, fiber, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(rid, req.user.id, name, brand || null, calories, carbs || 0, protein || 0, fat || 0, fiber || 0, amount || 100)
    // Keep only last 10
    db.prepare('DELETE FROM recent_foods WHERE user_id = ? AND id NOT IN (SELECT id FROM recent_foods WHERE user_id = ? ORDER BY used_at DESC LIMIT 10)')
      .run(req.user.id, req.user.id)
  }

  res.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(id))
})

app.delete('/api/meals/:id', authenticate, (req, res) => {
  const meal = db.prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!meal) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Goals ───────────────────────────────────────────────────────────────────

app.put('/api/users/goals', authenticate, (req, res) => {
  const { calories, carbs, protein, fat, water } = req.body
  db.prepare('UPDATE users SET daily_calories = ?, daily_carbs = ?, daily_protein = ?, daily_fat = ?, daily_water = ? WHERE id = ?')
    .run(calories || 2000, carbs || 250, protein || 100, fat || 70, water || 2500, req.user.id)
  res.json({ ok: true })
})

// ─── Activities ──────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = ['walking', 'running', 'cycling', 'gym', 'steps', 'other']

app.get('/api/activities', authenticate, (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'Date required' })
  const activities = db.prepare('SELECT * FROM activities WHERE user_id = ? AND date = ? ORDER BY created_at ASC').all(req.user.id, date)
  res.json(activities)
})

app.post('/api/activities', authenticate, (req, res) => {
  const { type, date, duration, distance, calories } = req.body
  if (!type || !date) return res.status(400).json({ error: 'Pflichtfelder fehlen' })
  if (!ACTIVITY_TYPES.includes(type)) return res.status(400).json({ error: 'Ungueltiger Aktivitätstyp' })
  const id = uuidv4()
  db.prepare('INSERT INTO activities (id, user_id, type, date, duration, distance, calories) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, type, date, parseInt(duration) || 0, parseFloat(distance) || 0, parseInt(calories) || 0)
  res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id))
})

app.delete('/api/activities/:id', authenticate, (req, res) => {
  const act = db.prepare('SELECT * FROM activities WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!act) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Favorites ───────────────────────────────────────────────────────────────

app.get('/api/favorites', authenticate, (req, res) => {
  const favs = db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json(favs)
})

app.post('/api/favorites', authenticate, (req, res) => {
  const { name, brand, calories, carbs, protein, fat, fiber, amount } = req.body
  if (!name || calories == null) return res.status(400).json({ error: 'Name und Kalorien erforderlich' })
  const id = uuidv4()
  try {
    db.prepare('INSERT INTO favorites (id, user_id, name, brand, calories, carbs, protein, fat, fiber, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, name, brand || null, calories, carbs || 0, protein || 0, fat || 0, fiber || 0, amount || 100)
    res.json(db.prepare('SELECT * FROM favorites WHERE id = ?').get(id))
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Bereits in Favoriten' })
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/favorites/:id', authenticate, (req, res) => {
  const fav = db.prepare('SELECT * FROM favorites WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!fav) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Recent Foods ─────────────────────────────────────────────────────────────

app.get('/api/recent', authenticate, (req, res) => {
  const recent = db.prepare('SELECT * FROM recent_foods WHERE user_id = ? ORDER BY used_at DESC LIMIT 10').all(req.user.id)
  res.json(recent)
})

// ─── Water ────────────────────────────────────────────────────────────────────

app.get('/api/water', authenticate, (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'Date required' })
  const rows = db.prepare('SELECT * FROM water_logs WHERE user_id = ? AND date = ? ORDER BY created_at ASC').all(req.user.id, date)
  const total = rows.reduce((s, r) => s + r.amount, 0)
  res.json({ entries: rows, total })
})

app.post('/api/water', authenticate, (req, res) => {
  const { date, amount } = req.body
  if (!date || amount == null) return res.status(400).json({ error: 'Date und amount erforderlich' })
  const id = uuidv4()
  db.prepare('INSERT INTO water_logs (id, user_id, date, amount) VALUES (?, ?, ?, ?)')
    .run(id, req.user.id, date, parseInt(amount))
  const total = db.prepare('SELECT SUM(amount) as t FROM water_logs WHERE user_id = ? AND date = ?').get(req.user.id, date)
  res.json({ ok: true, total: total ? total.t : 0 })
})

app.delete('/api/water/:id', authenticate, (req, res) => {
  const entry = db.prepare('SELECT * FROM water_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!entry) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('DELETE FROM water_logs WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/water-history', authenticate, (req, res) => {
  const { days } = req.query
  const n = parseInt(days) || 7
  const rows = db.prepare(`
    SELECT date, SUM(amount) as total
    FROM water_logs
    WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date ASC
  `).all(req.user.id, n)
  res.json(rows)
})

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }))

app.listen(PORT, '0.0.0.0', () => console.log('CT API running on port ' + PORT))
