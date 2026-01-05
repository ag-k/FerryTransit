#!/usr/bin/env node

/**
 * Start Firebase emulators with data persistence
 */

import { spawn, execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import net from 'net'

const projectRoot = process.cwd()
const exportDir = join(projectRoot, 'emulator-data', 'export')

console.log('🚀 Starting Firebase emulators with data persistence...')

function readEmulatorPortsFromFirebaseJson() {
  try {
    const firebaseJsonPath = join(projectRoot, 'firebase.json')
    const raw = readFileSync(firebaseJsonPath, 'utf8')
    const json = JSON.parse(raw)

    const emulators = json?.emulators ?? {}
    const firestorePort = emulators?.firestore?.port
    const authPort = emulators?.auth?.port

    return {
      firestorePort: typeof firestorePort === 'number' ? firestorePort : 8751,
      authPort: typeof authPort === 'number' ? authPort : 9099
    }
  } catch {
    // Fallback to this repo's defaults
    return { firestorePort: 8751, authPort: 9099 }
  }
}

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

function getPidsListeningOnTcpPort(port) {
  // macOS/Linux: lsof exists in dev environments
  // Return [] on any error.
  try {
    const out = execFileSync('lsof', ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

function killPids(pids, signal = 'SIGTERM') {
  for (const pid of pids) {
    try {
      process.kill(pid, signal)
    } catch {
      // ignore
    }
  }
}

async function cleanupFirestoreResidue(firestorePort) {
  const pids = getPidsListeningOnTcpPort(firestorePort)
  if (pids.length === 0) return

  console.log(`🧹 Cleaning up leftover process(es) listening on ${firestorePort}: ${pids.join(', ')}`)
  killPids(pids, 'SIGTERM')
  await new Promise((r) => setTimeout(r, 800))
  // If still there, force kill.
  const still = getPidsListeningOnTcpPort(firestorePort)
  if (still.length) {
    killPids(still, 'SIGKILL')
  }
}

try {
  const { firestorePort, authPort } = readEmulatorPortsFromFirebaseJson()

  // If the emulator suite is already running, don't try to start another one.
  // Firestore emulator does NOT auto-fallback to another port when taken and will fail hard.
  const [firestoreOpen, authOpen] = await Promise.all([isPortOpen(firestorePort), isPortOpen(authPort)])

  if (firestoreOpen && authOpen) {
    console.log(`✅ Firebase emulators already appear to be running (ports ${firestorePort}/${authPort} are open).`)
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

  // Start emulators with import and export-on-exit (spawn so we can handle Ctrl-C gracefully)
  const firebaseArgs = ['emulators:start']
  if (importFlag) firebaseArgs.push(importFlag)
  firebaseArgs.push(`--export-on-exit=${exportDir}`)

  const emulatorProcess = spawn('firebase', firebaseArgs, {
    stdio: 'inherit',
    cwd: projectRoot,
    shell: process.platform === 'win32'
  })

  let shuttingDown = false
  let forceTimer = null
  let sigintCount = 0

  const requestShutdown = async (reason, { allowForce } = { allowForce: true }) => {
    if (shuttingDown) {
      if (allowForce) {
        console.log(`⚠️  ${reason}: forcing cleanup...`)
        await cleanupFirestoreResidue(firestorePort)
        process.exit(130)
      } else {
        console.log(`ℹ️  ${reason}: already shutting down, waiting for clean shutdown...`)
      }
      return
    }

    shuttingDown = true
    console.log('\n🛑 Shutting down Firebase emulators... (press Ctrl-C again to force cleanup)')
    try {
      emulatorProcess.kill('SIGINT')
    } catch {
      // ignore
    }

    // If export-on-exit takes too long (or user kills too aggressively), ensure we don't leave residue.
    forceTimer = setTimeout(async () => {
      console.log('⏱️  Shutdown is taking too long. Forcing cleanup...')
      await cleanupFirestoreResidue(firestorePort)
      process.exit(130)
    }, 20_000)
  }

  process.on('SIGINT', () => {
    sigintCount += 1
    if (sigintCount >= 2) {
      void requestShutdown('Second SIGINT received', { allowForce: true })
      return
    }
    void requestShutdown('SIGINT received', { allowForce: true })
  })

  process.on('SIGTERM', () => {
    // SIGTERM is often sent by supervisors (e.g. concurrently) when another process fails.
    // Do a graceful shutdown, but do NOT force cleanup immediately on repeated SIGTERM,
    // otherwise we can corrupt the export-on-exit output.
    void requestShutdown('SIGTERM received', { allowForce: false })
  })

  emulatorProcess.on('exit', async (code, signal) => {
    if (forceTimer) clearTimeout(forceTimer)
    // If the user was shutting down, do a final check that Firestore isn't left behind.
    if (shuttingDown) {
      await cleanupFirestoreResidue(firestorePort)
    }
    if (signal) process.exit(0)
    process.exit(code ?? 0)
  })

} catch (error) {
  console.error('❌ Failed to start emulators:', error.message)
  process.exit(1)
}
