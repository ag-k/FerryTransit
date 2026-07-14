import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const moduleUrl = pathToFileURL(resolve('scripts/lib/transport-data.mjs')).href
const { createPublishManifest, formatGtfsDate, normalizeGtfsTime, sha256 } = await import(moduleUrl) as {
  formatGtfsDate: (value: string) => string | null
  normalizeGtfsTime: (value: string, options?: { includeSeconds?: boolean }) => string | null
  sha256: (contents: string | Buffer) => string
  createPublishManifest: (options: {
    sourceId: string
    environment: string
    gitSha?: string
    objects: Array<{ path: string; sha256: string; bytes: number }>
    generatedAt?: string
  }) => Record<string, unknown>
}

describe('transport-data', () => {
  it('GTFS日付をISO形式へ正規化する', () => {
    expect(formatGtfsDate('20260714')).toBe('2026-07-14')
    expect(formatGtfsDate('2026-07-14')).toBeNull()
  })

  it('24時以降を含むGTFS時刻を正規化する', () => {
    expect(normalizeGtfsTime('5:07:09')).toBe('05:07')
    expect(normalizeGtfsTime('25:10:00', { includeSeconds: true })).toBe('25:10:00')
    expect(normalizeGtfsTime('48:00:00')).toBeNull()
  })

  it('公開manifestをパス順に安定化する', () => {
    expect(createPublishManifest({
      sourceId: 'gtfs-public-data', environment: 'dev', gitSha: 'abc', generatedAt: '2026-07-14T00:00:00.000Z',
      objects: [
        { path: 'data/z.json', sha256: sha256('z'), bytes: 1 },
        { path: 'data/a.json', sha256: sha256('a'), bytes: 1 }
      ]
    })).toMatchObject({
      version: 1,
      sourceId: 'gtfs-public-data',
      environment: 'dev',
      gitSha: 'abc',
      objects: [{ path: 'data/a.json' }, { path: 'data/z.json' }]
    })
  })
})
