#!/usr/bin/env node

/**
 * Start Firebase emulators with data persistence
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import net from 'net'

const projectRoot = process.cwd()
const exportDir = join(projectRoot, 'emulator-data', 'export')

console.log('🚀 Starting Firebase emulators with data persistence...')

function isPortOpen(port, host = '127.0.0.1', timeoutMs = 300) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (result) => {
      try {
        socket.destroy()
      } catch {
        // ignore
      }
      resolve(result)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

try {
  // If the emulator suite is already running, don't try to start another one.
  // Firestore emulator does NOT auto-fallback to another port when taken and will fail hard.
  const [firestoreOpen, authOpen, uiWsOpen] = await Promise.all([
    isPortOpen(8095),
    isPortOpen(9099),
    isPortOpen(9151)
  ])

  if (firestoreOpen && authOpen && uiWsOpen) {
    console.log('✅ Firebase emulators already appear to be running (ports 8095/9099/9151 are open).')
    console.log('↪️  Skipping firebase emulators:start. If you need a clean restart, stop the running emulators and re-run this command.')
    process.exit(0)
  }

  // Check if export data exists
  const hasExistingData = existsSync(exportDir)
  const importFlag = hasExistingData ? `--import=${exportDir}` : ''

  if (hasExistingData) {
    console.log(`📥 Importing existing emulator data from: ${exportDir}`)
  } else {
    console.log('📝 No existing emulator data found, starting with fresh state')
  }

  console.log('🔄 Starting emulators with auto-export on exit...')

  // Start emulators with import and export-on-exit
  execSync(`firebase emulators:start ${importFlag} --export-on-exit=${exportDir}`, {
    stdio: 'inherit',
    cwd: projectRoot
  })

} catch (error) {
  console.error('❌ Failed to start emulators:', error.message)
  process.exit(1)
}
