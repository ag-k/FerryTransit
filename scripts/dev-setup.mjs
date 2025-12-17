#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * Sets up Firebase emulators for local development and registers a super admin
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()

console.log('🔧 Setting up Firebase emulators for local development...\n')

// Check if .env.local exists, if not create it from example
const envLocalPath = join(projectRoot, '.env.local')
const envExamplePath = join(projectRoot, '.env.example')

if (!existsSync(envLocalPath)) {
  console.log('📝 Creating .env.local from .env.example...')
  execSync(`cp "${envExamplePath}" "${envLocalPath}"`, { stdio: 'inherit' })
  console.log('✅ .env.local created. Please update it with your configuration if needed.\n')
}

// Ensure default emulator ports are unlikely to collide
try {
  const FUNCTIONS_PORT = '55002'
  const key = 'NUXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT'
  const current = readFileSync(envLocalPath, 'utf8')

  const hasKey = new RegExp(`^${key}=`, 'm').test(current)
  const updated = hasKey
    ? current.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${FUNCTIONS_PORT}`)
    : `${current.replace(/\n?$/, '\n')}${key}=${FUNCTIONS_PORT}\n`

  if (updated !== current) {
    writeFileSync(envLocalPath, updated, 'utf8')
    console.log(`✅ Set ${key}=${FUNCTIONS_PORT} in .env.local`)
  }
} catch (error) {
  console.log('⚠️  Failed to update .env.local emulator port automatically')
}

// Install Firebase CLI if not available
try {
  execSync('firebase --version', { stdio: 'pipe' })
  console.log('✅ Firebase CLI is already installed')
} catch (error) {
  console.log('📦 Installing Firebase CLI...')
  execSync('npm install -g firebase-tools', { stdio: 'inherit' })
  console.log('✅ Firebase CLI installed')
}

// Check if emulators are installed
try {
  execSync('firebase emulators:start --help', { stdio: 'pipe', cwd: projectRoot })
  console.log('✅ Firebase emulators are available')
} catch (error) {
  console.log('⚠️  Firebase emulators may not be properly installed')
}

console.log('\n🎉 Development environment setup complete!')
console.log('\n💡 Tip: Super admin will be registered automatically when emulators start')
