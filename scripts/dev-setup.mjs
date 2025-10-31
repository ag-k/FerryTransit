#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * Sets up Firebase emulators for local development
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
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
console.log('\n📋 Next steps:')
console.log('1. Start Firebase emulators: npm run firebase:emulators')
console.log('2. Start Nuxt development server: npm run dev')
console.log('3. Open browser to: http://localhost:3030')
console.log('4. Firebase Emulator UI: http://localhost:4000')
console.log('\n💡 Tip: Run both commands in separate terminals for best experience')
