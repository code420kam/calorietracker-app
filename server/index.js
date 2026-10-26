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
const JWT_SECRET = process.env.JWT_SECRET || 'calorietracker-secret-2024-change-in-production'

// DB setup
const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'data')
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
const db = new (require("better-sqlite3"))(path.join(DB_DIR, "calorietracker.db"))

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    daily_calories INTEGER DEFAULT 2000,
    daily_carbs REAL DEFAULT 250,
    daily_protein REAL DEFAULT 100,
    daily_fat REAL DEFAULT 70,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    carbs REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    amount REAL DEFAULT 100,
    type TEXT DEFAULT 'snack',
    date TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
`)

app.use(cors({ origin: '*' }))
app.use(express.json())

// Auth middleware
function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht autorisiert' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token ungültig' })
  }
}

// ─── AUTH ───────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Alle Felder erforderlich' })
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'E-Mail bereits registriert' })
    const hash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(id, name, email, hash)
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id, name, email } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) return res.status(401).json({ error: 'Falsche E-Mail oder Passwort' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Falsche E-Mail oder Passwort' })
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, dailyGoals: { calories: user.daily_calories, carbs: user.daily_carbs, protein: user.daily_protein, fat: user.daily_fat } }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, daily_calories, daily_carbs, daily_protein, daily_fat FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
  res.json({
    id: user.id, name: user.name, email: user.email,
    dailyGoals: { calories: user.daily_calories, carbs: user.daily_carbs, protein: user.daily_protein, fat: user.daily_fat }
  })
})

// ─── MEALS ───────────────────────────────────────────────────
app.get('/api/meals', authenticate, (req, res) => {
  const { date } = req.query
  const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC').all(req.user.id, date)
  res.json(meals)
})

app.post('/api/meals', authenticate, (req, res) => {
  const { name, calories, carbs, protein, fat, amount, type, date } = req.body
  if (!name || calories == null || !date) return res.status(400).json({ error: 'Pflichtfelder fehlen' })
  const id = uuidv4()
  db.prepare('INSERT INTO meals (id, user_id, name, calories, carbs, protein, fat, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, name, calories, carbs || 0, protein || 0, fat || 0, amount || 100, type || 'snack', date)
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id)
  res.json(meal)
})

app.delete('/api/meals/:id', authenticate, (req, res) => {
  const meal = db.prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!meal) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── GOALS ───────────────────────────────────────────────────
app.put('/api/users/goals', authenticate, (req, res) => {
  const { calories, carbs, protein, fat } = req.body
  db.prepare('UPDATE users SET daily_calories = ?, daily_carbs = ?, daily_protein = ?, daily_fat = ? WHERE id = ?')
    .run(calories || 2000, carbs || 250, protein || 100, fat || 70, req.user.id)
  res.json({ ok: true })
})

app.listen(PORT, '0.0.0.0', () => console.log(`CalorieTracker API running on :${PORT}`))
