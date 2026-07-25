import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const scriptPath = resolve('scripts/load-android-release-signing-env.zsh')
const temporaryDirectories: string[] = []

const createFixture = (missingService = '') => {
  const root = mkdtempSync(join(tmpdir(), 'ferry-android-signing-'))
  temporaryDirectories.push(root)
  const binDirectory = join(root, 'bin')
  const keystorePath = join(
    root,
    'Library/Application Support/FerryTransit/keys/ferrytransit-upload-2026.jks'
  )
  const securityPath = join(binDirectory, 'security')

  mkdirSync(binDirectory)
  mkdirSync(resolve(keystorePath, '..'), { recursive: true })
  writeFileSync(keystorePath, 'test keystore')
  writeFileSync(securityPath, `#!/bin/zsh
service=""
while (( $# > 0 )); do
  if [[ "$1" == "-s" ]]; then
    shift
    service="$1"
  fi
  shift
done
if [[ "$service" == "${missingService}" ]]; then
  exit 44
fi
if [[ "$service" == "FerryTransit Android Keystore Password" ]]; then
  print -- "store-secret"
elif [[ "$service" == "FerryTransit Android Key Password" ]]; then
  print -- "key-secret"
else
  exit 45
fi
`)
  chmodSync(securityPath, 0o755)

  return { root, keystorePath, securityPath }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('load-android-release-signing-env.zsh', () => {
  it('キーチェーンから秘密値を読み込み、4環境変数を親zshへ設定する', () => {
    const { root, keystorePath, securityPath } = createFixture()
    const result = spawnSync('/bin/zsh', [
      '-c',
      `source "$1"; print -- "$FERRYTRANSIT_ANDROID_KEYSTORE_PATH|$FERRYTRANSIT_ANDROID_KEY_ALIAS|${'${#FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD}'}|${'${#FERRYTRANSIT_ANDROID_KEY_PASSWORD}'}"`,
      'zsh',
      scriptPath
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: root,
        FERRYTRANSIT_SECURITY_BIN: securityPath,
        USER: 'release-user'
      }
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Androidリリース署名用の環境変数4項目を設定しました。')
    expect(result.stdout).toContain(`${keystorePath}|ferrytransit-upload-2026|12|10`)
    expect(result.stdout).not.toContain('store-secret')
    expect(result.stdout).not.toContain('key-secret')
  })

  it('キーチェーン項目を読めない場合は環境変数を残さない', () => {
    const missingService = 'FerryTransit Android Key Password'
    const { root, securityPath } = createFixture(missingService)
    const result = spawnSync('/bin/zsh', [
      '-c',
      `TRAPEXIT() { print -- "${'${FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD:-unset}'}|${'${FERRYTRANSIT_ANDROID_KEY_PASSWORD:-unset}'}"; }; source "$1"`,
      'zsh',
      scriptPath
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: root,
        FERRYTRANSIT_SECURITY_BIN: securityPath,
        USER: 'release-user'
      }
    })

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('unset|unset')
    expect(result.stderr).toContain(`キーチェーン項目「${missingService}」を読み込めません。`)
  })

  it('通常実行は拒否する', () => {
    const result = spawnSync('/bin/zsh', [scriptPath], {
      encoding: 'utf8'
    })

    expect(result.status).toBe(2)
    expect(result.stderr).toContain('source してください')
  })
})
