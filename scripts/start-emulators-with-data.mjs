#!/usr/bin/env node

/**
 * Start Firebase emulators with data persistence
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()
const exportDir = join(projectRoot, 'emulator-data', 'export')

console.log('🚀 Starting Firebase emulators with data persistence...')

try {
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
