#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * Sets up Firebase emulators for local development and registers a super admin
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { join } from 'path'

const projectRoot = process.cwd()
const require = createRequire(import.meta.url)

console.log('🔧 Setting up Firebase emulators for local development...\n')

// In sandboxed/test environments (e.g. Playwright), avoid any global installs or network access.
const skipFirebaseCli =
  process.env.SKIP_FIREBASE_CLI === '1' ||
  process.env.SKIP_FIREBASE_CLI === 'true' ||
  process.env.PLAYWRIGHT === '1' ||
  process.env.PLAYWRIGHT === 'true' ||
  process.env.CI === 'true'

const skipOxcBindingSetup =
  process.env.SKIP_OXC_BINDING_SETUP === '1' ||
  process.env.SKIP_OXC_BINDING_SETUP === 'true'

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

if (skipFirebaseCli) {
  console.log('⏭️  Skipping Firebase CLI setup (SKIP_FIREBASE_CLI/PLAYWRIGHT/CI is set)')
} else {
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
}

const getOxcBindingSpec = () => {
  if (process.platform !== 'darwin') {
    return null
  }

  const bindingPackageNameByArch = {
    arm64: '@oxc-parser/binding-darwin-arm64',
    x64: '@oxc-parser/binding-darwin-x64'
  }

  const packageName = bindingPackageNameByArch[process.arch]
  if (!packageName) {
    return null
  }

  const oxcPackagePaths = [
    join(projectRoot, 'node_modules/nuxt/node_modules/oxc-parser/package.json'),
    join(projectRoot, 'node_modules/oxc-parser/package.json')
  ]

  for (const packagePath of oxcPackagePaths) {
    if (!existsSync(packagePath)) {
      continue
    }

    try {
      const raw = readFileSync(packagePath, 'utf8')
      const oxcPackage = JSON.parse(raw)
      const expectedVersion = oxcPackage?.optionalDependencies?.[packageName]

      if (!expectedVersion) {
        continue
      }

      return { packageName, expectedVersion }
    } catch (error) {
      // Continue to next candidate
    }
  }

  return null
}

const ensureOxcBinding = () => {
  const bindingSpec = getOxcBindingSpec()
  if (!bindingSpec) {
    return
  }

  const { packageName, expectedVersion } = bindingSpec
  let installedVersion = null

  try {
    const installedPath = require.resolve(`${packageName}/package.json`, {
      paths: [projectRoot]
    })
    installedVersion = JSON.parse(readFileSync(installedPath, 'utf8')).version
  } catch (error) {
    installedVersion = null
  }

  if (installedVersion === expectedVersion) {
    console.log(`✅ ${packageName}@${installedVersion} is available`)
    return
  }

  const desiredSpecifier = `${packageName}@${expectedVersion}`
  if (installedVersion) {
    console.log(
      `📦 Updating ${packageName} (${installedVersion} -> ${expectedVersion})...`
    )
  } else {
    console.log(`📦 Installing ${desiredSpecifier}...`)
  }

  try {
    execSync(
      `npm install --no-save --ignore-scripts --no-audit --no-fund ${desiredSpecifier}`,
      { stdio: 'inherit', cwd: projectRoot }
    )
    console.log(`✅ ${desiredSpecifier} installed`)
  } catch (error) {
    console.error(`❌ Failed to install ${desiredSpecifier}`)
    console.error(`   Run manually: npm install --no-save ${desiredSpecifier}`)
    process.exit(1)
  }
}

if (skipOxcBindingSetup) {
  console.log('⏭️  Skipping OXC native binding setup (SKIP_OXC_BINDING_SETUP is set)')
} else {
  ensureOxcBinding()
}

console.log('\n🎉 Development environment setup complete!')
console.log('\n💡 Tip: Super admin will be registered automatically when emulators start')
