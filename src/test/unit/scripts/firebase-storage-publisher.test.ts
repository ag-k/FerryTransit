import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/firebase-storage-publisher.mjs')).href
const { buildFirebaseAdminOptions, createFirebaseStoragePublisher, formatTimestampJst } = await import(moduleUrl)

const createBucket = (initial?: Buffer) => {
  let remote = initial
  const backups = new Map<string, Buffer>()
  const save = vi.fn(async (contents: Buffer) => { remote = Buffer.from(contents) })
  const saveBackup = vi.fn(async (contents: Buffer, _options?: unknown) => {
    backups.set('backups/test/example.json', Buffer.from(contents))
  })
  const bucket = {
    file(path: string) {
      if (path === 'data/example.json') {
        return {
          exists: async () => [Boolean(remote)],
          download: async () => [remote],
          save
        }
      }
      return {
        save: async (contents: Buffer, options?: unknown) => {
          backups.set(path, Buffer.from(contents))
          await saveBackup(contents, options)
        }
      }
    }
  }
  return { bucket, save, saveBackup, backups }
}

describe('firebase storage publisher', () => {
  it('同一内容なら公開とバックアップを省略する', async () => {
    const fake = createBucket(Buffer.from('{"ok":true}'))
    const publisher = createFirebaseStoragePublisher({ target: 'dev' }, { bucket: fake.bucket })
    const result = await publisher.publishObject({
      contents: Buffer.from('{"ok":true}'), storagePath: 'data/example.json', sourceId: 'test'
    })
    expect(result.status).toBe('skipped')
    expect(fake.save).not.toHaveBeenCalled()
    expect(fake.backups.size).toBe(0)
  })

  it('変更時は既存内容を退避し、公開後ハッシュを検証する', async () => {
    const fake = createBucket(Buffer.from('{"old":true}'))
    const publisher = createFirebaseStoragePublisher({ target: 'dev' }, { bucket: fake.bucket })
    const result = await publisher.publishObject({
      contents: Buffer.from('{"new":true}'), storagePath: 'data/example.json', sourceId: 'test',
      backupPathFactory: () => 'backups/test/example.json'
    })
    expect(result.status).toBe('uploaded')
    expect(result.backupPath).toBe('backups/test/example.json')
    expect(fake.backups.get('backups/test/example.json')?.toString()).toBe('{"old":true}')
    expect(fake.save).toHaveBeenCalledWith(
      Buffer.from('{"new":true}'),
      expect.objectContaining({ resumable: false })
    )
    expect(fake.saveBackup).toHaveBeenCalledWith(
      Buffer.from('{"old":true}'),
      expect.objectContaining({ resumable: false })
    )
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('バックアップ時刻を日本時間で生成する', () => {
    expect(formatTimestampJst(new Date('2026-07-14T10:20:30Z'))).toBe('20260714-192030')
  })

  it('サービスアカウント鍵JSONはcert資格情報として読み込む', () => {
    const directory = mkdtempSync(join(tmpdir(), 'firebase-admin-service-account-'))
    const credentialPath = join(directory, 'credentials.json')
    const previousPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    const certCredential = vi.fn(() => ({ kind: 'cert' }))
    const applicationDefaultCredential = vi.fn(() => ({ kind: 'adc' }))
    writeFileSync(credentialPath, JSON.stringify({ type: 'service_account', project_id: 'test' }))
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath

    try {
      const options = buildFirebaseAdminOptions('test-bucket', {
        certCredential,
        applicationDefaultCredential
      })
      expect(options.credential).toEqual({ kind: 'cert' })
      expect(certCredential).toHaveBeenCalledWith({ type: 'service_account', project_id: 'test' })
      expect(applicationDefaultCredential).not.toHaveBeenCalled()
    } finally {
      if (previousPath === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS
      else process.env.GOOGLE_APPLICATION_CREDENTIALS = previousPath
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('WIFのexternal_account JSONはApplication Default Credentialsとして読み込む', () => {
    const directory = mkdtempSync(join(tmpdir(), 'firebase-admin-wif-'))
    const credentialPath = join(directory, 'credentials.json')
    const previousPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    const certCredential = vi.fn(() => ({ kind: 'cert' }))
    const applicationDefaultCredential = vi.fn(() => ({ kind: 'adc' }))
    writeFileSync(credentialPath, JSON.stringify({ type: 'external_account', audience: 'test' }))
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath

    try {
      const options = buildFirebaseAdminOptions('test-bucket', {
        certCredential,
        applicationDefaultCredential
      })
      expect(options.credential).toEqual({ kind: 'adc' })
      expect(applicationDefaultCredential).toHaveBeenCalledOnce()
      expect(certCredential).not.toHaveBeenCalled()
    } finally {
      if (previousPath === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS
      else process.env.GOOGLE_APPLICATION_CREDENTIALS = previousPath
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
