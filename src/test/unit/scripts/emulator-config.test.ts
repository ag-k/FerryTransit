import { describe, expect, it } from 'vitest'
import {
  configureAdminEmulatorEnv,
  readEmulatorConfig
} from '../../../../scripts/emulator-config.mjs'

describe('emulator-config', () => {
  it('firebase.jsonのEmulatorポートを単一の接続設定へ変換する', () => {
    const config = readEmulatorConfig(process.cwd())

    expect(config.ports).toMatchObject({
      auth: 9099,
      firestore: 8751,
      storage: 9199,
      functions: 55002
    })
    expect(config.hosts.firestore).toBe('127.0.0.1:8751')
  })

  it('Firebase CLIが渡した接続先を上書きしない', () => {
    const env: Record<string, string> = {
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:9999'
    }

    configureAdminEmulatorEnv({ projectRoot: process.cwd(), env })

    expect(env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:9999')
    expect(env.FIREBASE_AUTH_EMULATOR_HOST).toBe('127.0.0.1:9099')
    expect(env.FIREBASE_STORAGE_EMULATOR_HOST).toBe('127.0.0.1:9199')
  })

  it('firebase.jsonを参照できない場合は安全な既定値を使う', () => {
    const config = readEmulatorConfig('/path/that/does/not/exist')

    expect(config.ports.firestore).toBe(8751)
    expect(config.hosts.auth).toBe('127.0.0.1:9099')
  })
})
