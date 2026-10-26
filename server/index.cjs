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
`)

// Migration: add new columns if they don't exist
const addCol = (table, col, def) => { try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`) } catch (_) {} }
addCol('users', 'gender', "TEXT DEFAULT 'male'")
addCol('users', 'age', 'INTEGER DEFAULT 30')
addCol('users', 'height', 'INTEGER DEFAULT 175')
addCol('users', 'weight', 'REAL DEFAULT 70')
addCol('users', 'activity_level', "TEXT DEFAULT 'moderate'")
addCol('meals', 'fiber', 'REAL DEFAULT 0')

app.use(cors({ origin: '*' }))
app.use(express.json())

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
        dailyGoals: { calories: tdee, carbs: user.daily_carbs, protein: user.daily_protein, fat: user.daily_fat }
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
    dailyGoals: { calories: tdee, carbs: user.daily_carbs, protein: user.daily_protein, fat: user.daily_fat }
  })
})

app.put('/api/users/profile', authenticate, (req, res) => {
  const { gender, age, height, weight, activityLevel } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
  const g = gender || user.gender
  const a = parseInt(age) || user.age
  const h = parseInt(height) || user.height
  const w = parseFloat(weight) || user.weight
  const al = activityLevel || user.activity_level
  const bmr = calcBMR(g, a, h, w)
  const tdee = calcTDEE(bmr, al)
  db.prepare(`UPDATE users SET gender=?, age=?, height=?, weight=?, activity_level=?, daily_calories=? WHERE id=?`)
    .run(g, a, h, w, al, tdee, req.user.id)
  res.json({ ok: true, tdee, bmr })
})

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
  res.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(id))
})

app.delete('/api/meals/:id', authenticate, (req, res) => {
  const meal = db.prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!meal) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.put('/api/users/goals', authenticate, (req, res) => {
  const { calories, carbs, protein, fat } = req.body
  db.prepare('UPDATE users SET daily_calories = ?, daily_carbs = ?, daily_protein = ?, daily_fat = ? WHERE id = ?')
    .run(calories || 2000, carbs || 250, protein || 100, fat || 70, req.user.id)
  res.json({ ok: true })
})

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }))

app.listen(PORT, '0.0.0.0', () => console.log('CT API running on port ' + PORT))
