#!/usr/bin/env node
// Auto-restart daemon for CalorieTracker backend
const { spawn } = require('child_process')
const path = require('path')

const SERVER_PATH = path.join(__dirname, 'index.cjs')
const LOG_FILE = '/tmp/ct-server.log'
const fs = require('fs')

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(LOG_FILE, line)
  console.error(msg)
}

let child = null
let restarting = false

function startServer() {
  if (child) {
    try { child.kill('SIGTERM') } catch (_) {}
    child = null
  }
  log('Starting CT server...')
  child = spawn('node', [SERVER_PATH], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.pipe(fs.createWriteStream(LOG_FILE, { flags: 'a' }))
  child.stderr.pipe(fs.createWriteStream(LOG_FILE, { flags: 'a' }))
  child.on('exit', (code) => {
    if (!restarting) {
      log(`CT server exited with code ${code}, restarting in 3s...`)
      restarting = true
      setTimeout(() => { restarting = false; startServer() }, 3000)
    }
  })
}

startServer()
log('Daemon started, PID=' + process.pid)
process.on('SIGTERM', () => { log('Daemon received SIGTERM'); process.exit(0) })
