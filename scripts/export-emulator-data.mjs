#!/usr/bin/env node

/**
 * Export Firebase emulator data for persistence
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()
const exportDir = join(projectRoot, 'emulator-data', 'export')

console.log('📤 Exporting Firebase emulator data...')

try {
  // Create export directory if it doesn't exist
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true })
    console.log(`📁 Created export directory: ${exportDir}`)
  }

  // Export emulator data
  execSync(`firebase emulators:export ${exportDir}`, {
    stdio: 'inherit',
    cwd: projectRoot
  })

  console.log('✅ Emulator data exported successfully')
  console.log(`📂 Export location: ${exportDir}`)

} catch (error) {
  console.error('❌ Failed to export emulator data:', error.message)
  process.exit(1)
}
