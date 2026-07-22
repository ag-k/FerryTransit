import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import capacitorConfig from '../../../capacitor.config'

describe('Capacitor splash screen configuration', () => {
  it('keeps the native splash visible until the web app explicitly hides it', () => {
    expect(capacitorConfig.plugins?.SplashScreen).toMatchObject({
      launchAutoHide: false
    })
  })
})

describe('Capacitor build privacy configuration', () => {
  it('removes the Firebase Analytics measurement ID from generated app assets', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/cap-build.mjs'), 'utf8')

    expect(source).toContain(
      'CAPACITOR_BUILD=true NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID= npm run generate'
    )
  })

  it('bundles an app privacy manifest matching the App Store declarations', () => {
    const manifest = readFileSync(
      resolve(process.cwd(), 'ios/App/App/PrivacyInfo.xcprivacy'),
      'utf8'
    )
    const project = readFileSync(
      resolve(process.cwd(), 'ios/App/App.xcodeproj/project.pbxproj'),
      'utf8'
    )

    expect(manifest).toContain('NSPrivacyCollectedDataTypeSearchHistory')
    expect(manifest).toContain('NSPrivacyCollectedDataTypeProductInteraction')
    expect(manifest.match(/NSPrivacyCollectedDataTypePurposeAnalytics/g)).toHaveLength(2)
    expect(manifest).not.toContain('NSPrivacyCollectedDataTypeCrashData')
    expect(manifest).not.toContain('NSPrivacyCollectedDataTypeDeviceID')
    expect(project).toContain('PrivacyInfo.xcprivacy in Resources')
  })

  it('declares that the app does not use non-exempt encryption', () => {
    const infoPlist = readFileSync(
      resolve(process.cwd(), 'ios/App/App/Base.lproj/Info.plist'),
      'utf8'
    )

    expect(infoPlist).toMatch(
      /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/
    )
  })
})
