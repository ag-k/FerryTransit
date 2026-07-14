import { describe, expect, it, vi } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/firebase-storage-publisher.mjs')).href
const { createFirebaseStoragePublisher, formatTimestampJst } = await import(moduleUrl)

const createBucket = (initial?: Buffer) => {
  let remote = initial
  const backups = new Map<string, Buffer>()
  const save = vi.fn(async (contents: Buffer) => { remote = Buffer.from(contents) })
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
        save: async (contents: Buffer) => { backups.set(path, Buffer.from(contents)) }
      }
    }
  }
  return { bucket, save, backups }
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
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('バックアップ時刻を日本時間で生成する', () => {
    expect(formatTimestampJst(new Date('2026-07-14T10:20:30Z'))).toBe('20260714-192030')
  })
})
