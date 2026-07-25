import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const IOS_BUNDLE_ID = 'com.naturebot-lab.FerryTransit'
const ANDROID_APPLICATION_ID = 'com.naturebotlab.ferrytransit'
const PRODUCTION_FIREBASE_PROJECT = 'oki-ferryguide'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function uniqueMatches(text, pattern, label) {
  const values = [...text.matchAll(pattern)].map(match => match[1].replaceAll('"', '').trim())
  assert(values.length > 0, `${label}が見つかりません`)
  const unique = [...new Set(values)]
  assert(unique.length === 1, `${label}が構成間で不一致です: ${unique.join(', ')}`)
  return unique[0]
}

function parsePublicEnv(text) {
  const result = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(NUXT_PUBLIC_[A-Z0-9_]+)=(.*)$/)
    if (match) result[match[1]] = match[2].trim()
  }
  return result
}

export function verifyReleaseConfigContents(contents) {
  const packageJson = JSON.parse(contents.packageJson)
  const packageLock = JSON.parse(contents.packageLock)
  const firebaseRc = JSON.parse(contents.firebaseRc)
  const publicEnv = parsePublicEnv(contents.productionEnv)

  const semver = packageJson.version?.match(/^(\d+)\.(\d+)\.(\d+)$/)
  assert(semver, `package.jsonのversionが有効なSemVerではありません: ${packageJson.version}`)
  assert(packageLock.version === packageJson.version, 'package-lock.jsonのversionがpackage.jsonと不一致です')
  assert(
    packageLock.packages?.['']?.version === packageJson.version,
    'package-lock.jsonのルートpackage versionがpackage.jsonと不一致です',
  )

  const nativeVersion = `${semver[1]}.${semver[2]}`
  const androidVersionName = uniqueMatches(
    contents.androidBuildGradle,
    /^\s*versionName\s+"([^"]+)"/gm,
    'Android versionName',
  )
  const androidVersionCode = Number(uniqueMatches(
    contents.androidBuildGradle,
    /^\s*versionCode\s+(\d+)/gm,
    'Android versionCode',
  ))
  const androidApplicationId = uniqueMatches(
    contents.androidBuildGradle,
    /^\s*applicationId\s+"([^"]+)"/gm,
    'Android applicationId',
  )
  const androidNamespace = uniqueMatches(
    contents.androidBuildGradle,
    /^\s*namespace\s+"([^"]+)"/gm,
    'Android namespace',
  )

  const iosVersion = uniqueMatches(
    contents.iosProject,
    /^\s*MARKETING_VERSION = ([^;]+);/gm,
    'iOS MARKETING_VERSION',
  )
  const iosBuild = Number(uniqueMatches(
    contents.iosProject,
    /^\s*CURRENT_PROJECT_VERSION = (\d+);/gm,
    'iOS CURRENT_PROJECT_VERSION',
  ))
  const iosBundleId = uniqueMatches(
    contents.iosProject,
    /^\s*PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/gm,
    'iOS PRODUCT_BUNDLE_IDENTIFIER',
  )
  const iosDeploymentTarget = Number(uniqueMatches(
    contents.iosProject,
    /^\s*IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);/gm,
    'iOS deployment target',
  ))

  const minSdk = Number(uniqueMatches(
    contents.androidVariables,
    /^\s*minSdkVersion = (\d+)/gm,
    'Android minSdkVersion',
  ))
  const compileSdk = Number(uniqueMatches(
    contents.androidVariables,
    /^\s*compileSdkVersion = (\d+)/gm,
    'Android compileSdkVersion',
  ))
  const targetSdk = Number(uniqueMatches(
    contents.androidVariables,
    /^\s*targetSdkVersion = (\d+)/gm,
    'Android targetSdkVersion',
  ))
  const capacitorAppId = uniqueMatches(
    contents.capacitorConfig,
    /^\s*appId:\s*'([^']+)'/gm,
    'Capacitor appId',
  )

  assert(publicEnv.NUXT_PUBLIC_APP_VERSION === packageJson.version, 'Web公開versionがpackage.jsonと不一致です')
  assert(/^\d{4}-\d{2}-\d{2}$/.test(publicEnv.NUXT_PUBLIC_RELEASE_DATE ?? ''), 'Web公開日がYYYY-MM-DD形式ではありません')
  assert(androidVersionName === nativeVersion, 'Android versionNameがWebのmajor.minorと不一致です')
  assert(iosVersion === nativeVersion, 'iOS MARKETING_VERSIONがWebのmajor.minorと不一致です')
  assert(Number.isInteger(androidVersionCode) && androidVersionCode > 0, 'Android versionCodeが正の整数ではありません')
  assert(iosBuild === androidVersionCode, 'iOS build番号とAndroid versionCodeが不一致です')

  assert(androidApplicationId === ANDROID_APPLICATION_ID, 'Android applicationIdが本番値ではありません')
  assert(androidNamespace === ANDROID_APPLICATION_ID, 'Android namespaceが本番値ではありません')
  assert(capacitorAppId === ANDROID_APPLICATION_ID, 'Capacitor appIdがAndroid本番値ではありません')
  assert(iosBundleId === IOS_BUNDLE_ID, 'iOS Bundle IDが本番値ではありません')
  assert(iosDeploymentTarget === 14, 'iOS deployment targetが14.0ではありません')
  assert(minSdk === 23, 'Android minSdkVersionが23ではありません')
  assert(compileSdk === 36 && targetSdk === 36, 'Android compileSdkVersion/targetSdkVersionが36ではありません')

  assert(publicEnv.NUXT_PUBLIC_FIREBASE_PROJECT_ID === PRODUCTION_FIREBASE_PROJECT, 'Firebase Project IDが本番値ではありません')
  assert(firebaseRc.projects?.prod === PRODUCTION_FIREBASE_PROJECT, 'Firebase prod aliasが本番Project IDと不一致です')
  assert(firebaseRc.projects?.default === PRODUCTION_FIREBASE_PROJECT, 'Firebase default aliasが本番Project IDと不一致です')
  assert(firebaseRc.projects?.dev !== PRODUCTION_FIREBASE_PROJECT, 'Firebase dev aliasが本番Project IDと同一です')
  assert(
    publicEnv.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN === `${PRODUCTION_FIREBASE_PROJECT}.firebaseapp.com`,
    'Firebase Auth Domainが本番Projectと不一致です',
  )
  assert(
    publicEnv.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.startsWith(`${PRODUCTION_FIREBASE_PROJECT}.`),
    'Firebase Storage Bucketが本番Projectと不一致です',
  )

  return {
    webVersion: packageJson.version,
    nativeVersion,
    buildNumber: androidVersionCode,
    releaseDate: publicEnv.NUXT_PUBLIC_RELEASE_DATE,
    iosBundleId,
    androidApplicationId,
    iosDeploymentTarget,
    minSdk,
    targetSdk,
    firebaseProject: PRODUCTION_FIREBASE_PROJECT,
  }
}

export async function loadReleaseConfigContents(rootDir = process.cwd()) {
  const paths = {
    packageJson: 'package.json',
    packageLock: 'package-lock.json',
    productionEnv: '.env.production',
    firebaseRc: '.firebaserc',
    androidBuildGradle: 'android/app/build.gradle',
    androidVariables: 'android/variables.gradle',
    iosProject: 'ios/App/App.xcodeproj/project.pbxproj',
    capacitorConfig: 'capacitor.config.ts',
  }
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await readFile(resolve(rootDir, path), 'utf8')]),
  )
  return Object.fromEntries(entries)
}

export async function verifyReleaseConfig({ rootDir = process.cwd(), verifyGit = true } = {}) {
  if (verifyGit) {
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '.env.production'], {
      cwd: rootDir,
      stdio: 'ignore',
    })
    assert(tracked.status !== 0, '.env.productionがGit追跡対象です')

    const ignored = spawnSync('git', ['check-ignore', '-q', '.env.production'], {
      cwd: rootDir,
      stdio: 'ignore',
    })
    assert(ignored.status === 0, '.env.productionがGit ignore対象ではありません')
  }

  return verifyReleaseConfigContents(await loadReleaseConfigContents(rootDir))
}

async function main() {
  const result = await verifyReleaseConfig()
  process.stdout.write([
    'リリース設定の整合性を検証しました。',
    `- Web: ${result.webVersion} / ${result.releaseDate}`,
    `- iOS: ${result.nativeVersion} (${result.buildNumber}), iOS ${result.iosDeploymentTarget}+, ${result.iosBundleId}`,
    `- Android: ${result.nativeVersion} (${result.buildNumber}), API ${result.minSdk}-${result.targetSdk}, ${result.androidApplicationId}`,
    `- Firebase: ${result.firebaseProject} (prod/default alias一致)`,
    '- .env.production: Git追跡外・ignore対象',
    '',
  ].join('\n'))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
