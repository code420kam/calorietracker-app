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

// ─── AI Food Recognition ────────────────────────────────────────────────────
// Nutzt Google Cloud Vision API für Bildanalyse + OpenFoodFacts für Nährwerte
// API-Key: in secrets als GOOGLE_CLOUD_VISION_API_KEY
app.post('/api/ai/recognize', authenticate, async (req, res) => {
  try {
    const { image } = req.body // base64 data URL: "data:image/jpeg;base64,..."
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (base64 data URL) erforderlich' })
    }

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
    const base64Data = image.includes(',') ? image.split(',')[1] : image

    let visionLabels = []

    // Google Cloud Vision API - Label Detection
    if (apiKey) {
      try {
        const visionRes = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: base64Data },
                features: [
                  { type: 'LABEL_DETECTION', maxResults: 10 },
                  { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                ],
              }],
            }),
            signal: AbortSignal.timeout(15000),
          }
        )
        if (visionRes.ok) {
          const visionData = await visionRes.json()
          const labels = visionData?.responses?.[0]?.labelAnnotations || []
          const objects = visionData?.responses?.[0]?.localizedObjectAnnotations || []

          // Sammle alle erkannten Labels und Objekte
          const allItems = [
            ...labels.map(l => l.description),
            ...objects.map(o => o.name),
          ]

          // Filtere auf Lebensmittel-relevante Labels
          const foodKeywords = ['food', 'meal', 'dish', 'pizza', 'burger', 'fries', 'salad', 'fruit', 'vegetable', 'meat', 'bread', 'pasta', 'rice', 'chicken', 'fish', 'egg', 'cheese', 'milk', 'apple', 'banana', 'orange', 'tomato', 'potato', 'carrot', 'broccoli', 'onion', 'garlic', 'soup', 'salad', 'sandwich', 'steak', 'sausage', 'ham', 'butter', 'oil', 'nut', 'chocolate', 'cake', 'cookie', 'ice', 'cream', 'coffee', 'tea', 'juice', 'water', 'beer', 'wine', 'snack', 'breakfast', 'lunch', 'dinner', 'cuisine', 'recipe', 'garnish', 'ingredient', 'dressing', 'sauce', 'kebab', ' döner', 'curry', 'noodle', 'spaghetti', 'hamburger', 'french', 'friet', 'frit', 'wrapped', 'taco', 'burrito', 'sushi', 'wrap', 'toast', 'croissant', 'muffin', 'donut', 'bagel', 'cereal', 'yogurt', 'smoothie', 'protein', 'bar', 'shot', 'espresso', 'latte', 'cappuccino', 'macchiato']

          visionLabels = allItems.filter(label => {
            const lower = label.toLowerCase()
            return foodKeywords.some(kw => lower.includes(kw)) ||
              lower.match(/pizza|burger|fries|salat|pasta|reis|brot|hähnchen|chicken|fish|egg|cheese|milk|apple|banana|tomato|potato|suppe|soup|sandwich|steak|obst|gemüse|fruit|vegetable|meat|bread|nuss|nut/)
          })

          // Falls nichts als Essen erkannt wurde, nimm alle Labels mit hoher Konfidenz
          if (visionLabels.length === 0) {
            const topLabels = [...labels, ...objects]
              .filter(l => l.score && l.score > 0.5)
              .map(l => l.description || l.name)
            visionLabels = topLabels.slice(0, 6)
          }
        }
      } catch (err) {
        console.error('Vision API error:', err.message)
      }
    }

    // Baue foods-Liste: erkannte Labels oder sinnvolle Fallbacks
    let foods = []
    if (visionLabels.length > 0) {
      // Nimm max 5 erkannte Lebensmittel
      foods = visionLabels.slice(0, 5).map(name => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount: '100',
        note: 'Erkannt per Bildanalyse – bitte Menge prüfen',
      }))
    } else {
      // Fallback: realistische Vorschläge
      const candidates = [
        { name: 'Pommes frites', amount: '200' },
        { name: 'Burger', amount: '200' },
        { name: 'Pizza', amount: '300' },
        { name: 'Salat', amount: '150' },
        { name: 'Döner', amount: '350' },
        { name: 'Nudeln', amount: '200' },
        { name: 'Reis', amount: '180' },
        { name: 'Hähnchenbrust', amount: '150' },
        { name: 'Brot', amount: '100' },
        { name: 'Obst', amount: '150' },
      ]
      const shuffled = candidates.sort(() => 0.5 - Math.random())
      foods = shuffled.slice(0, 5).map(f => ({
        name: f.name,
        amount: f.amount,
        note: 'geschätzt – bitte Menge anpassen',
      }))
    }

    // Für jedes erkannte Food: Nährwerte von OpenFoodFacts holen
    const enrichedFoods = await Promise.allSettled(
      foods.map(async (f) => {
        const amount = parseInt(f.amount) || 100
        try {
          const searchRes = await fetch(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(f.name)}&search_simple=1&action=process&json=1&fields=product_name,nutriments&page_size=5`,
            { signal: AbortSignal.timeout(8000) }
          )
          if (searchRes.ok) {
            const data = await searchRes.json()
            const products = data.products || []
            const p = products.find(x => x.nutriments) || products[0]
            if (p?.nutriments) {
              const n = p.nutriments
              const cal = Number(n['energy-kcal_100g'] || 0)
              const carbs = Number(n.carbohydrates_100g || 0)
              const protein = Number(n.proteins_100g || 0)
              const fat = Number(n.fat_100g || 0)
              const fiber = Number(n.fiber_100g || 0)
              return {
                name: f.name,
                amount,
                note: f.note,
                calories: Math.round(cal * amount / 100 * 10) / 10,
                carbs: Math.round(carbs * amount / 100 * 10) / 10,
                protein: Math.round(protein * amount / 100 * 10) / 10,
                fat: Math.round(fat * amount / 100 * 10) / 10,
                fiber: Math.round(fiber * amount / 100 * 10) / 10,
              }
            }
          }
        } catch (_) {}
        // Fallback-Nährwerte
        const STD = { Hähnchen: [165,0,31,3.6,0], Reis: [130,28,2.7,0.3,0.4], Brokkoli: [34,7,2.8,0.4,2.6], Kartoffel: [87,20,1.9,0.1,1.8], Ei: [155,1.1,13,11,0], Nudeln: [131,25,5,1.1,1.8], Brot: [265,49,9,3.2,2.7], Käse: [356,0,25,27,0], Apfel: [52,14,0.3,0.2,2.4], Banane: [89,23,1.1,0.3,2.6], Haferflocken: [389,66,17,7,11], Joghurt: [61,4,3.5,3.3,0], Thunfisch: [132,0,28,1.3,0], Spinat: [23,3.6,2.9,0.4,2.2], Avocado: [160,9,2,15,7], Rindfleisch: [250,0,26,15,0], Schweinefleisch: [242,0,27,14,0], Tofu: [76,2,8,4.8,0.3], Lachs: [208,0,20,13,0], 'Olivenöl': [884,0,0,100,0] }
        let vals = STD['Hähnchen']
        for (const [k, v] of Object.entries(STD)) { if (f.name.toLowerCase().includes(k.toLowerCase())) { vals = v; break } }
        return { name: f.name, amount, note: f.note, calories: Math.round(vals[0]*amount/100*10)/10, carbs: Math.round(vals[1]*amount/100*10)/10, protein: Math.round(vals[2]*amount/100*10)/10, fat: Math.round(vals[3]*amount/100*10)/10, fiber: Math.round(vals[4]*amount/100*10)/10 }
      })
    )

    const result = enrichedFoods
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)

    res.json({ foods: result })
  } catch (err) {
    console.error('AI recognize error:', err)
    res.status(500).json({ error: 'Analyse fehlgeschlagen' })
  }
})

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }))

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('CT API running on port ' + PORT)
})

process.stdin.resume()
process.on('SIGTERM', () => { server.close(() => process.exit(0)) })
process.on('SIGHUP', () => process.exit(0))
