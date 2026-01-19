#!/usr/bin/env node
/**
 * Capacitor Build Script
 * Handles platform-specific Bundle ID configuration
 *
 * Usage:
 *   node scripts/cap-build.mjs ios [--open]
 *   node scripts/cap-build.mjs android [--open]
 *   node scripts/cap-build.mjs ios --dev [--open]  (use development environment)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Platform-specific Bundle IDs
const BUNDLE_IDS = {
  ios: 'com.naturebot-lab.FerryTransit',
  android: 'com.naturebotlab.ferrytransit',
};

const CONFIG_PATH = join(projectRoot, 'capacitor.config.ts');

function readConfig() {
  return readFileSync(CONFIG_PATH, 'utf-8');
}

function writeConfig(content) {
  writeFileSync(CONFIG_PATH, content, 'utf-8');
}

function updateAppId(content, newAppId) {
  return content.replace(
    /appId:\s*['"]([^'"]+)['"]/,
    `appId: '${newAppId}'`
  );
}

function run(command) {
  console.log(`\n> ${command}\n`);
  execSync(command, { stdio: 'inherit', cwd: projectRoot });
}

async function main() {
  const args = process.argv.slice(2);
  const platform = args[0];
  const shouldOpen = args.includes('--open');
  const isDev = args.includes('--dev');

  if (!platform || !['ios', 'android'].includes(platform)) {
    console.error('Usage: node scripts/cap-build.mjs <ios|android> [--dev] [--open]');
    process.exit(1);
  }

  const targetAppId = BUNDLE_IDS[platform];
  const envFile = isDev ? '.env.development' : '.env.production';
  const envPath = join(projectRoot, envFile);
  const targetEnvPath = join(projectRoot, '.env');

  console.log(`\n📱 Building for ${platform.toUpperCase()}`);
  console.log(`   Bundle ID: ${targetAppId}`);
  console.log(`   Environment: ${isDev ? 'Development' : 'Production'}`);
  console.log(`   Using: ${envFile}\n`);

  // Check if env file exists
  if (!existsSync(envPath)) {
    console.error(`❌ Environment file not found: ${envFile}`);
    process.exit(1);
  }

  // Save original config and .env
  const originalConfig = readConfig();
  const originalEnv = existsSync(targetEnvPath) ? readFileSync(targetEnvPath, 'utf-8') : null;

  try {
    // Copy environment file
    copyFileSync(envPath, targetEnvPath);
    console.log(`✅ Copied ${envFile} to .env`);

    // Update config with platform-specific Bundle ID
    const updatedConfig = updateAppId(originalConfig, targetAppId);
    writeConfig(updatedConfig);
    console.log(`✅ Updated capacitor.config.ts with appId: ${targetAppId}`);

    // Run Nuxt generate
    run('CAPACITOR_BUILD=true npm run generate');

    // Sync with Capacitor
    run(`npx cap sync ${platform}`);

    // Open IDE if requested
    if (shouldOpen) {
      run(`npx cap open ${platform}`);
    }

    console.log(`\n✅ ${platform.toUpperCase()} build completed successfully!`);
  } finally {
    // Restore original config
    writeConfig(originalConfig);
    console.log('✅ Restored original capacitor.config.ts');

    // Restore original .env
    if (originalEnv !== null) {
      writeFileSync(targetEnvPath, originalEnv, 'utf-8');
      console.log('✅ Restored original .env');
    }
  }
}

main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
