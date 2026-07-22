import { describe, expect, it } from 'vitest'
import { verifyReleaseConfigContents } from '../../../../scripts/verify-release-config.mjs'

function fixture(overrides: Record<string, string> = {}) {
  return {
    packageJson: JSON.stringify({ version: '2.4.0' }),
    packageLock: JSON.stringify({ version: '2.4.0', packages: { '': { version: '2.4.0' } } }),
    productionEnv: [
      'NUXT_PUBLIC_APP_VERSION=2.4.0',
      'NUXT_PUBLIC_RELEASE_DATE=2026-07-14',
      'NUXT_PUBLIC_FIREBASE_PROJECT_ID=oki-ferryguide',
      'NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=oki-ferryguide.firebaseapp.com',
      'NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=oki-ferryguide.firebasestorage.app',
    ].join('\n'),
    firebaseRc: JSON.stringify({
      projects: { default: 'oki-ferryguide', prod: 'oki-ferryguide', dev: 'oki-ferryguide-dev' },
    }),
    androidBuildGradle: `
      namespace "com.naturebotlab.ferrytransit"
      applicationId "com.naturebotlab.ferrytransit"
      versionCode 24000
      versionName "2.4"
    `,
    androidVariables: `
      minSdkVersion = 23
      compileSdkVersion = 36
      targetSdkVersion = 36
    `,
    iosProject: `
      CURRENT_PROJECT_VERSION = 24000;
      IPHONEOS_DEPLOYMENT_TARGET = 14.0;
      MARKETING_VERSION = 2.4;
      PRODUCT_BUNDLE_IDENTIFIER = "com.naturebot-lab.FerryTransit";
    `,
    capacitorConfig: `appId: 'com.naturebotlab.ferrytransit',`,
    ...overrides,
  }
}

describe('verifyReleaseConfigContents', () => {
  it('Web・iOS・Android・Firebaseの本番設定が一致する', () => {
    expect(verifyReleaseConfigContents(fixture())).toEqual({
      webVersion: '2.4.0',
      nativeVersion: '2.4',
      buildNumber: 24000,
      releaseDate: '2026-07-14',
      iosBundleId: 'com.naturebot-lab.FerryTransit',
      androidApplicationId: 'com.naturebotlab.ferrytransit',
      iosDeploymentTarget: 14,
      minSdk: 23,
      targetSdk: 36,
      firebaseProject: 'oki-ferryguide',
    })
  })

  it('iOSとAndroidのビルド番号不一致を拒否する', () => {
    expect(() => verifyReleaseConfigContents(fixture({
      iosProject: `
        CURRENT_PROJECT_VERSION = 24001;
        IPHONEOS_DEPLOYMENT_TARGET = 14.0;
        MARKETING_VERSION = 2.4;
        PRODUCT_BUNDLE_IDENTIFIER = "com.naturebot-lab.FerryTransit";
      `,
    }))).toThrow('iOS build番号とAndroid versionCodeが不一致です')
  })

  it('production環境のdev Firebase Project IDを拒否する', () => {
    expect(() => verifyReleaseConfigContents(fixture({
      productionEnv: [
        'NUXT_PUBLIC_APP_VERSION=2.4.0',
        'NUXT_PUBLIC_RELEASE_DATE=2026-07-14',
        'NUXT_PUBLIC_FIREBASE_PROJECT_ID=oki-ferryguide-dev',
        'NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=oki-ferryguide-dev.firebaseapp.com',
        'NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=oki-ferryguide-dev.firebasestorage.app',
      ].join('\n'),
    }))).toThrow('Firebase Project IDが本番値ではありません')
  })

  it('Android targetSdk 36未満を拒否する', () => {
    expect(() => verifyReleaseConfigContents(fixture({
      androidVariables: `
        minSdkVersion = 23
        compileSdkVersion = 35
        targetSdkVersion = 35
      `,
    }))).toThrow('Android compileSdkVersion/targetSdkVersionが36ではありません')
  })
})
