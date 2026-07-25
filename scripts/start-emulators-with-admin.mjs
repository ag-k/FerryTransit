#!/usr/bin/env node

/**
 * Firebase Emulator Setup Script
 * Registers a super admin account when emulators are running
 */

import { spawn } from 'child_process'
import { setTimeout as sleep } from 'timers/promises'
import net from 'net'
import { readEmulatorConfig } from './emulator-config.mjs'

const projectRoot = process.cwd()
const { ports, hosts } = readEmulatorConfig(projectRoot)

console.log('🚀 Starting Firebase emulator setup...\n')

// Function to check if a port is open
async function isPortOpen(port, maxAttempts = 30, interval = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket()
        const timeout = global.setTimeout(() => {
          socket.destroy()
          reject(new Error('Timeout'))
        }, 500)

        socket.on('connect', () => {
          clearTimeout(timeout)
          socket.destroy()
          resolve()
        })

        socket.on('error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })

        socket.connect(port, 'localhost')
      })
      return true
    } catch (err) {
      if (attempt < maxAttempts) {
        await sleep(interval)
      }
    }
  }
  return false
}

// Start Firebase emulators in background
console.log('📡 Starting Firebase emulators...')
const emulatorProcess = spawn('firebase', ['emulators:start'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: projectRoot,
  shell: true
})

// Wait for emulators to be ready by checking ports
console.log('⏳ Waiting for emulators to start...')
const firestoreReady = await isPortOpen(ports.firestore)
const authReady = await isPortOpen(ports.auth)

if (!firestoreReady || !authReady) {
  console.log('❌ Emulators failed to start properly')
  emulatorProcess.kill('SIGINT')
  process.exit(1)
}

console.log('✅ Emulators are ready!')

// Register super admin
console.log('👤 Registering super admin for development...')
try {
  const { execSync } = await import('child_process')
  execSync('node src/scripts/setup-admin.js admin@ferry-dev.local Admin123! super', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: '', // Use emulator mode
      FIREBASE_AUTH_EMULATOR_HOST: hosts.auth,
      FIRESTORE_EMULATOR_HOST: hosts.firestore
    }
  })
  console.log('✅ Super admin registered successfully')
} catch (error) {
  console.log('⚠️  Could not register super admin. You can run it manually with:')
  console.log('   node src/scripts/setup-admin.js admin@ferry-dev.local Admin123! super')
}

// Build code-managed public timetable data
console.log('📅 Building code-managed public timetable data...')
try {
  const { execSync } = await import('child_process')
  execSync('npm run timetable:build', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env
    }
  })
  console.log('✅ Public timetable data built successfully')
} catch (error) {
  console.log('⚠️  Could not build public timetable data. You can run it manually with:')
  console.log('   npm run timetable:build')
}

// Import fare data
console.log('💰 Importing fare data...')
try {
  const { execSync } = await import('child_process')
  execSync('node scripts/import-fare-data.mjs', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      FIREBASE_AUTH_EMULATOR_HOST: hosts.auth,
      FIRESTORE_EMULATOR_HOST: hosts.firestore
    }
  })
  console.log('✅ Fare data imported successfully')
} catch (error) {
  console.log('⚠️  Could not import fare data. You can run it manually with:')
  console.log('   node scripts/import-fare-data.mjs')
}

// Upload fare data to Storage
console.log('📤 Uploading fare data to Firebase Storage...')
try {
  const { execSync } = await import('child_process')
  execSync('node scripts/upload-fare-data.mjs', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      FIREBASE_AUTH_EMULATOR_HOST: hosts.auth,
      FIRESTORE_EMULATOR_HOST: hosts.firestore,
      FIREBASE_STORAGE_EMULATOR_HOST: hosts.storage
    }
  })
  console.log('✅ Fare data uploaded to Storage successfully')
} catch (error) {
  console.log('⚠️  Could not upload fare data to Storage. You can run it manually with:')
  console.log('   node scripts/upload-fare-data.mjs')
}

// Upload timetable data to Storage
console.log('📤 Uploading timetable data to Firebase Storage...')
try {
  const { execSync } = await import('child_process')
  execSync('node scripts/upload-timetable-data.mjs', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      FIREBASE_AUTH_EMULATOR_HOST: hosts.auth,
      FIRESTORE_EMULATOR_HOST: hosts.firestore,
      FIREBASE_STORAGE_EMULATOR_HOST: hosts.storage
    }
  })
  console.log('✅ Timetable data uploaded to Storage successfully')
} catch (error) {
  console.log('⚠️  Could not upload timetable data to Storage. You can run it manually with:')
  console.log('   node scripts/upload-timetable-data.mjs')
}

console.log('\n🎉 Firebase emulators are running with super admin configured!')
console.log('\n🔑 Super admin credentials:')
console.log('   Email: admin@ferry-dev.local')
console.log('   Password: Admin123!')
console.log('   Role: Super Admin')
console.log('\n🌐 Firebase Emulator UI: http://localhost:4000')
console.log('📱 Development server: https://ferry-transit.localhost (run npm run dev in another terminal)')
console.log('   Raw Nuxt server: run npm run dev:local if you need a port-number URL')

// Keep the process running and forward emulator output
emulatorProcess.stdout.on('data', (data) => {
  process.stdout.write(data)
})

emulatorProcess.stderr.on('data', (data) => {
  process.stderr.write(data)
})

emulatorProcess.on('close', (code) => {
  console.log(`Emulator process exited with code ${code}`)
  process.exit(code)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shututting down emulators...')
  emulatorProcess.kill('SIGINT')
  process.exit(0)
})
